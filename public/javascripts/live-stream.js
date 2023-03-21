function sendMessage() {
    console.log("hello")
    var input = document.querySelector(".chat-input");
    var message = input.value;
    if (!message) return;
    var username = 'You: ';
    var chatbox = document.querySelector('.chat-messages');
    var newMessage = document.createElement("div");
    newMessage.classList.add("chat-message");
    var newUsername = document.createElement("span");
    newUsername.classList.add("chat-username");
    newUsername.innerHTML = username;
    var newText = document.createElement("span");
    newText.classList.add("chat-text");
    newText.innerHTML = message;
    newMessage.appendChild(newUsername);
    newMessage.appendChild(newText);
    chatbox.appendChild(newMessage);
    input.value = "";
    chatbox.scrollTop = chatbox.scrollHeight; // Add this line
}
var input = document.querySelector(".chat-input");

function lockVideo() {
    var video = document.getElementById("LiveVideo");
    video.style.filter = "blur(5px)";
    video.pause();
    video.removeAttribute("controls");

    
  }

function showAlert() {
    let title= "please pay to proceed"
    var alertBox = document.getElementById("foreground-div");
    alertBox.style.display = "block"
    
  }

function hideAlert() {
    var alertBox = document.getElementById("alert-box");
    alertBox.style.display = "none";
}


async function connectWallet(){
  accounts = await window.ethereum.request({method:"eth_requestAccounts"}).catch((err)=>{
    console.log(err.code)

  })
  console.log(accounts)
}

// function connectWallet(){
// let button = document.getElementById("metamask");
// button.addEventListener("click", () => {
//     if (typeof window.ethereum !== "undefined") {
//         window.ethereum.request();
//     } else if (typeof window.web3 !== "undefined") {
//         window.web3.currentProvider.enable();
//     } else {
//         console.log("MetaMask is not installed");
//     }
// })};