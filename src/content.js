let vid;

let style = document.createElement("link");
style.rel = "stylesheet";
style.type = "text/css";
style.href = chrome.extension.getURL("css/content.css");
(document.head || document.documentElement).appendChild(style);

chrome.storage.local.get(["login", "highlightFeature"], function (items) {
    if (items.login && items.highlightFeature) {
        vid = get_video_id();
        get_hls_sections(vid);
    }
});

chrome.extension.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.action === "hls-on" && !vid) {
        vid = get_video_id();
        console.log(`Listener: ${vid}`);
        get_hls_sections(vid);
    }
});

function waitForEl(selector, callback, count = 1) {
    if ($(selector).length == count) {
        callback();
    } else {
        setTimeout(function () {
            waitForEl(selector, callback, count);
        }, 500);
    }
}

function get_video_id() {
    let group = location.href.match(
        "https://www[.]twitch[.]tv/videos/([0-9]+)"
    );
    if (group) {
        console.log(group[1]);
        return group[1];
    }
}

function get_hls_sections(vid) {
    chrome.runtime.sendMessage(
        { action: "getHls", vid: vid },
        function (response) {
            if (response.vsections) {
                edit_seekbar(response.vsections);
            } else {
                show_alert(response.message);
            }
        }
    );
}

function show_alert(message) {
    $("div[data-test-selector='persistent-player']").append(
        get_toast_warning_html(message)
    );
    document.getElementById("Toast-dismissButton").onclick = function () {
        document.getElementById("Toast-warning").style.display = "none";
    };
    console.log(`show alert ${message}`);
}

function get_toast_warning_html(message) {
    return `
    <div class="tw-absolute tw-align-items-stretch tw-top-0 tw-flex tw-flex-column tw-full-width tw-overflow-visible">
    <div class="p-1" id="Toast-warning">
    <div class="Toast Toast--warning", style="float: right;">
        <span class="Toast-icon">
        <!-- <%= octicon "alert" %> -->
        <svg width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-alert" aria-hidden="true">
            <path fill-rule="evenodd" d="M8.893 1.5c-.183-.31-.52-.5-.887-.5s-.703.19-.886.5L.138 13.499a.98.98 0 0 0 0 1.001c.193.31.53.501.886.501h13.964c.367 0 .704-.19.877-.5a1.03 1.03 0 0 0 .01-1.002L8.893 1.5zm.133 11.497H6.987v-2.003h2.039v2.003zm0-3.004H6.987V5.987h2.039v4.006z"></path>
        </svg>
        </span>
        <span class="Toast-content">${message}</span>
    <button class="Toast-dismissButton" id="Toast-dismissButton">
        <!-- <%= octicon "x" %> -->
        <svg width="12" height="16" viewBox="0 0 12 16" class="octicon octicon-x" aria-hidden="true">
            <path fill-rule="evenodd" d="M7.48 8l3.75 3.75-1.48 1.48L6 9.48l-3.75 3.75-1.48-1.48L4.52 8 .77 4.25l1.48-1.48L6 6.52l3.75-3.75 1.48 1.48L7.48 8z"></path>
        </svg>
        </button>
    </div>
    </div>
    </div>
    `;
}

function edit_seekbar(sections) {
    let html = "";
    sections.forEach((element) => {
        let color_rgb;
        let color_rgba;
        if (element.length > 2) {
            color_rgb = `rgb(${element[2].slice(0, 3).join(", ")})`;
            color_rgba = `rgba(${element[2].join(", ")})`;
        } else {
            color_rgb = "rgb(255, 204, 0)";
            color_rgba = "rgba(255, 204, 0, 0.8)";
        }
        html += `<span data-test-selector="seekbar-segment__segment" class="seekbar-segment tw-absolute" style="left: ${element[0]}%; width: ${element[1]}%; background-color: ${color_rgba}; border-right: 2px;border-left: 2px;"></span>`;
    });
    $(document).ready(function () {
        waitForEl(
            ".seekbar-segment",
            function () {
                // $(".seekbar-bar").prepend(html);
                $(".seekbar-segment").eq(1).after(html);
                detect_change();
            },
            2
        );
        console.log("Highlighting is complete.");
    });
}

function detect_change() {
    waitForEl(".tw-pd-x-2", function () {
        let target = document.getElementsByClassName("tw-pd-x-2")[0];
        let observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                console.log(mutation);
                if (mutation.removedNodes.length > 0) {
                    observer.disconnect();
                    get_hls_sections(vid);
                }
            });
        });
        var config = {
            attributes: false,
            childList: true,
            characterData: false,
        };
        observer.observe(target, config);
        console.log("dectect pass");
    });
}
