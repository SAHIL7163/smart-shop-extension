function getProductData() {
  const title = document.getElementById("productTitle")?.innerText.trim();
  let price = document.querySelector(".a-price .a-offscreen")?.innerText.trim();

  // If .a-offscreen is empty, get price from .a-price-whole
  if (!price) {
    const symbol = document.querySelector(".a-price-symbol")?.innerText.trim() || "₹";
    const whole = document.querySelector(".a-price-whole")?.innerText.trim();
    if (whole) {
      price = `${symbol}${whole}`;
    }
  }

  return { title, price };
}

// Ensure product is loaded
function waitForProductData(callback) {
  let tries = 0;
  const interval = setInterval(() => {
    const data = getProductData();
    if (data.title || tries > 10) {
      // stop after 10 tries (5s)
      clearInterval(interval);
      callback(data);
    }
    tries++;
  }, 500);
}

// send data to popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg === "getProduct") {
    waitForProductData((data) => {
      sendResponse(data);
    });
    return true;
  }
});
