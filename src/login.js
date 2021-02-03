if (location.search.substring(1).split("&").includes("wrong=true")) {
    $("#incorrect").show();
} 

document.getElementById("loginForm").onsubmit = function (evt) {
    evt.preventDefault();
    let form = `username=${$("#username").val()}&password=${$(
        "#password"
    ).val()}`;
    let username = document.getElementById("username");
    let password = document.getElementById("password");
    let button = document.getElementById("signin");

    username.disabled = true;
    password.disabled = true;
    button.disabled = true;
    button.textContent = "Signing in...";

    chrome.runtime.sendMessage(
        { action: "auth.token", formData: form },
        function (response) {
            if (response.result) {
                window.location.href = "popup.html";
            } else {
                username.disabled = false;
                password.disabled = false;
                button.disabled = false;
                button.textContent = "Sign in";
                $("#incorrect").show();
            }
        }
    );

    window.location.href = "signing.html";
};
