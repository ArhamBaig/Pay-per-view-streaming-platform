// Get the submit button of the video upload form
const submitBtn = document.querySelector('#upload-form button[type="submit"]');

// Attach an event listener to the submit button
submitBtn.addEventListener('click', (event) => {
  // Prevent the default form submission
  event.preventDefault();

  // Check if the video is paid
  const videoStatus = document.querySelector('#upload-form select[name="status"]').value;
  if (videoStatus === 'paid') {
    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
      // MetaMask is not installed, prompt user to install it
      alert('Please install MetaMask to upload paid videos.');
      window.location.href = 'https://metamask.io/download/';
      return;
    }
    
    // Check if MetaMask is connected
    window.ethereum.enable()
      .then(() => {
        // MetaMask is connected, submit the video upload form
        document.querySelector('#upload-form').submit();
      })
      .catch((error) => {
        console.error(error);
        // Handle error as necessary
      });
  } else {
    // Video is free, submit the video upload form
    document.querySelector('#upload-form').submit();
  }
});
