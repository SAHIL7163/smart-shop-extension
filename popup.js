async function fetchSimilarProducts(query) {
  try {
    const response = await fetch(
      `https://real-time-product-search.p.rapidapi.com/search-v2?q=${encodeURIComponent(
        query
      )}&country=in&language=en&sort_by=BEST_MATCH&product_condition=ANY&return_filters=true`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-host": "real-time-product-search.p.rapidapi.com",
          "x-rapidapi-key":
            "d22d80dd8dmshb2609f8ddd4e7a8p187c2djsn930a3e919805",
        },
      }
    );

    if (!response.ok) throw new Error("API request failed");
    const data = await response.json();
    return data;
  } catch (err) {
    return { error: err.message };
  }
}

// Add this function to popup.js

async function getComparison(queryProduct, alternativeProduct) {
  const apiKey = "AIzaSyDxWdyolHlH9g66pSKXZmqA8_gMgZELPpM";
  // Replace with your Gemini API endpoint and key
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  const prompt = `Compare these two products:\nOriginal: ${queryProduct.title} (Price: ${queryProduct.price})\nAlternative: ${alternativeProduct.product_title} (Price: ${alternativeProduct.offer.price})\nHow is the alternative better than the original in one line?`;

  const messagesForGemini = [
    {
      role: "user",
      parts: [{ text: prompt }]
    }
  ];

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: messagesForGemini })
  });

  const data = await response.json();

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "No comparison available."
  );
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, "getProduct", async (response) => {
    const resultDiv = document.getElementById("result");

    if (chrome.runtime.lastError) {
      resultDiv.innerText = "Error: " + chrome.runtime.lastError.message;
      return;
    }

    if (!response?.title) {
      resultDiv.innerText = "No product found";
      return;
    }

    const currentPrice = response.price
      ? parseFloat(response.price.replace(/[^0-9.]/g, ""))
      : Infinity;

    resultDiv.innerHTML = `<p class="searching">Searching for similar products...</p>`;

    // Check cache
    const cacheKey = `similar_products_${response.title}`;
    const cachedData = await new Promise((resolve) => {
      chrome.storage.local.get(cacheKey, (result) => resolve(result[cacheKey]));
    });

    let data;
    if (cachedData) {
      data = cachedData;
    } else {
      data = await fetchSimilarProducts(response.title);
      if (!data.error) {
        chrome.storage.local.set({ [cacheKey]: data });
      }
    }

    if (data.error) {
      resultDiv.innerHTML = `<p class="error">Error: ${data.error}</p>`;
      return;
    }

    if (data.data?.products && data.data.products.length > 0) {
      const lowerPricedProducts = data.data.products.filter((item) => {
        const itemPrice = item.offer.price
          ? parseFloat(item.offer.price.replace(/[^0-9.]/g, ""))
          : Infinity;
        console.log(
          `Comparing ${item.product_title} (${itemPrice}) with current price (${currentPrice})`
        );
        return itemPrice < currentPrice;
      });

      if (lowerPricedProducts.length > 0) {
        resultDiv.innerHTML = "<h2>Cheaper Alternatives</h2><ul class='product-list'>";
        for (const item of lowerPricedProducts) {
          const photo =
            item.product_photos && item.product_photos.length > 0
              ? item.product_photos[0]
              : "";
          const comparison = await getComparison(response, item);

          resultDiv.innerHTML += `
      <li class="product-item">
        <img src="${photo}" alt="${item.product_title}" class="product-image">
        <div class="product-details">
          <a href="${item.offer.offer_page_url}" target="_blank" class="product-title">${item.product_title}</a>
          <p class="product-price">Price: ${item.offer.price || "N/A"}</p>
          <p class="comparison">${comparison}</p>
        </div>
      </li>`;
        }
        resultDiv.innerHTML += "</ul>";
      }
      else {
        resultDiv.innerHTML =
          "<p class='no-results'>No cheaper alternatives found.</p>";
      }
    } else {
      resultDiv.innerHTML =
        "<p class='no-results'>No similar products found.</p>";
    }
  });
});