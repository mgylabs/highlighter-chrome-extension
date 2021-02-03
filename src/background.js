let cachedDict = {};

class AuthManager {
    static accessToken;
    static refreshToken;
    static loginStatus;
    static isSigning = false;

    static launch(access, refresh, login) {
        this.accessToken = access;
        this.refreshToken = refresh;
        this.loginStatus = login;
        if (this.loginStatus) {
            chrome.browserAction.setPopup({
                popup: "src/popup.html",
            });
        } else if (this.isSigning) {
            chrome.browserAction.setPopup({
                popup: "src/signing.html",
            });
        } else {
            chrome.browserAction.setPopup({
                popup: "src/login.html",
            });
        }
    }

    static singing() {
        this.isSigning = true;
        chrome.browserAction.setPopup({
            popup: "src/signing.html",
        });
    }

    static cancel() {
        this.isSigning = false;
        chrome.browserAction.setPopup({
            popup: "src/login.html",
        });
    }

    static signIn(access, refresh) {
        this.accessToken = access;
        this.refreshToken = refresh;
        this.loginStatus = true;
        this.signing = false;
        chrome.storage.local.set({
            accessToken: this.accessToken,
            refreshToken: this.refreshToken,
            login: this.loginStatus,
        });
        chrome.browserAction.setPopup({
            popup: "src/popup.html",
        });
    }

    static signOut() {
        this.accessToken = null;
        this.refreshToken = null;
        this.loginStatus = false;
        chrome.storage.local.remove(["accessToken", "refreshToken", "login"]);
        chrome.browserAction.setPopup({
            popup: "src/login.html",
        });
    }
}


function httpAuthAsync(method, url, callback, data = null) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.responseType = "json";
    url = "https://mgylabs.herokuapp.com" + url;
    xmlHttp.onreadystatechange = function () {
        if (xmlHttp.readyState == xmlHttp.DONE) {
            callback(xmlHttp.status, xmlHttp.response);
        }
    };
    xmlHttp.open(method, url, true);
    xmlHttp.setRequestHeader(
        "Content-Type",
        "application/x-www-form-urlencoded;charset=UTF-8"
    );
    xmlHttp.send(data);
}

function httpRequestAsync(method, url, callback, jsonData = null) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.responseType = "json";
    url = "https://mgylabs.herokuapp.com" + url;
    xmlHttp.onreadystatechange = function () {
        if (xmlHttp.readyState == xmlHttp.DONE) {
            if (xmlHttp.status == 401) {
                let form = `refresh=${AuthManager.refreshToken}`;
                httpAuthAsync(
                    "POST",
                    "/auth/token/refresh",
                    function (status, response) {
                        if (status == 200) {
                            AuthManager.signIn(
                                response.access,
                                response.refresh
                            );
                            httpRequestAsync(method, url, callback, jsonData);
                        } else {
                            AuthManager.signOut();
                        }
                    },
                    form
                );
            } else {
                callback(xmlHttp.status, xmlHttp.response);
            }
        }
    };
    xmlHttp.open(method, url, true);
    xmlHttp.setRequestHeader(
        "Authorization",
        `Bearer ${AuthManager.accessToken}`
    );
    xmlHttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlHttp.send(JSON.stringify(jsonData));
}

chrome.storage.local.get(
    ["accessToken", "refreshToken", "login"],
    function (items) {
        AuthManager.launch(items.accessToken, items.refreshToken, items.login);
    }
);

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (!tab.url.startsWith("https://www.twitch.tv/videos/")) {
        chrome.browserAction.disable(tabId);
    }
}); 

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log(
        sender.tab
            ? "from a content script:" + sender.tab.url
            : "from the extension"
    );
    console.log(request.action);
    if (request.action === "getHls") {
        httpRequestAsync(
            "GET",
            `/highlighter/v1/twitch/${request.vid}?limit=3`,
            function (status, response) {
                if (status == 200) {
                    let result = [];
                    response.highlights.forEach((element) => {
                        result.push([
                            (element.start / response.duration) * 100,
                            ((element.end - element.start) /
                                response.duration) *
                                100,
                        ]);
                    });
                    sendResponse({ vsections: result });
                } else if (status == 404) {
                    sendResponse({
                        vsections: null,
                        message:
                            "Highlighter is not yet available for this video.",
                    });
                }
            }
        );
    } else if (request.action === "auth.token") {
        AuthManager.singing();
        httpAuthAsync(
            "POST",
            "/auth/token",
            function (status, response) {
                if (status == 200) {
                    AuthManager.signIn(response.access, response.refresh);
                    chrome.runtime.sendMessage({ result: true });
                    sendResponse({ result: true });
                } else {
                    AuthManager.cancel();
                    chrome.runtime.sendMessage({ result: false });
                    sendResponse({ result: false });
                }
            },
            request.formData
        );
    } else if (request.action === "auth.signout") {
        AuthManager.signOut()
        sendResponse({ result: true });
    }
    return true;
});
