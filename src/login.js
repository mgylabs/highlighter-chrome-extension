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

    chrome.runtime.sendMessage(
        { action: "auth.token", formData: form },
        function (response) {
            if (response.result) {
                window.location.href = "popup.html";
            } else {
                username.disabled = false;
                password.disabled = false;
                button.disabled = false;
                $("#incorrect").show();
            }
        }
    );
};
