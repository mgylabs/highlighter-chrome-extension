chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.result == true) {
        window.location.href = "popup.html";
    } else {
        window.location.href = "login.html?wrong=true";
    }
});
