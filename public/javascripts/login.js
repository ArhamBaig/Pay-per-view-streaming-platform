
function validatelogin() {
    var user_email = document.getElementById('email').value;
    var user_password = document.getElementById('password').value;
    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: user_email, password: user_password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.message === 'Login successful') {
            window.location.href = '/home';
        } else {
            console.log("Invalid username or password. Please try again.");
        }
    });
  };
 
// function registeruser() {
//     var user_first_name = document.getElementById('first_name').value;
//     var user_last_name = document.getElementById('last_name').value;
//     var user_reg_email = document.getElementById('reg_email').value;
//     var user_reg_password = document.getElementById('reg_password').value;
//     fetch('/login', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({ first_name:user_first_name,last_name:user_last_name ,reg_email: user_reg_email, reg_password: user_reg_password })
//     })
//     .then(res => res.json())
//     .then(data => {
//         if (data.message === 'Login successful') {
//             req.session.isLoggedIn = true;
//             window.location.href = '/home';
//         } else {
//             console.log("Invalid username or password. Please try again.");
//         }
//     });
//   };
  
