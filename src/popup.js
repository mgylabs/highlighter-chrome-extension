chrome.storage.local.get(["login"], function (items) {
    if (items.login) {
        init_toggle_div();
    } else {
        window.location.href = "login.html";
        console.log("show login");
    }
});

function init_toggle_div() {
    var checkbox = document.getElementById("highlight-feature");

    chrome.storage.local.get("highlightFeature", function (items) {
        if (items.highlightFeature) {
            checkbox.checked = items.highlightFeature;
        }
    });

    checkbox.addEventListener("click", function () {
        chrome.storage.local.set(
            { highlightFeature: checkbox.checked },
            function () {
                if (checkbox.checked) {
                    chrome.tabs.query(
                        { active: true, currentWindow: true },
                        function (tabs) {
                            chrome.tabs.sendMessage(
                                tabs[0].id,
                                { action: "hls-on" } /* callback */
                            );
                        }
                    );
                }
            }
        );
    });

    $("#signout").click(function () {
        chrome.storage.local.remove(
            ["accessToken", "refreshToken", "login"],
            function () {
                $("#loginDiv").show();
                $("#toggleDiv").hide();
                window.location.href = "login.html";
            }
        );
    });
}
