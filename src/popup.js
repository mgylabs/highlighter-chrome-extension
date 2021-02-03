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
        chrome.runtime.sendMessage(
            { action: "auth.signout" },
            function (response) {
                if (response.result) {
                    window.location.href = "login.html";
                }
            }
        );
    });
}

init_toggle_div();
