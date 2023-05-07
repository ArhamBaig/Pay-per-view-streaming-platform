function lockVideo() {
    let video = document.getElementById("offlineVideo");
    video.style.filter = "blur(5px)";
    video.pause();
    video.removeAttribute("controls");
}

function showAlert() {
    let title = "Please pay to proceed";
    let alertBox = document.getElementById("alert-box");
    alertBox.innerHTML = `<div class="alert alert-danger">${title}</div>`;
    alertBox.style.display = "block";
}

function onCanPlayHandler() {
    lockVideo();
    showAlert();
}

function lockStream() {
    let player = videojs('live-stream');
    player.controls(false); // disable playback controls
    player.pause(); // pause the video
    player.el().style.filter = 'blur(5px)';
    player.el().style.pointerEvents = 'none';
}
