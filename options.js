/*
    Save the newly created user to the Chrome Storage API
*/
function saveUser(){
  // get the current list of users so we can append the new user onto it
  chrome.storage.sync.get({
    users: []

  }, function(details) {
    // get email from form
    var email = document.getElementById("emailAddress").value;
    // Email pattern match
    var emailPattern = /[^\s@]+@[^\s@]+\.[^\s@]+/;

    // ensure email passes pattern match
    if(emailPattern.test(email)){
      // get key from form
      var pubKey = document.getElementById("contactPubKey").value;
      var users = details.users;

      // add new user to list
      userObj = [email, pubKey];
      users.push(userObj);

      // set the updated list to storage
      chrome.storage.sync.set({
        users: users

      }, function() {
        // Update the header to let user know their setting was saved
        var status = document.getElementById('status');
        status.textContent = 'Successfully added new email';
        // disable the input fields while saving data
        $('#emailAddress').attr("disabled", true);
        $('#contactPubKey').attr("disabled", true);

        // After 1.75 seconds, revert the header to it's original text & empty the inputs
        setTimeout(function() {
          status.textContent = 'Users you can communicate with:';
          $('#emailAddress').attr("disabled", false);
          $('#contactPubKey').attr("disabled", false);
          document.getElementById('emailAddress').value = '';
          document.getElementById('contactPubKey').value = '';
        }, 1750);

        // update list of users by reloading it
        restoreOptions();
      });
    }else{
      // if the email is invalid, set a cheeky reminder
      document.getElementById('emailAddress').value = 'Invalid: enter a valid email';
    }
  });
}

/*
    Restores form info from chrome.storage for auto-filling
*/
function restoreOptions(){
  // Would have liked to have removed the generation option when
  // there was an already generated value, and visa-versa for the pub/pri key displays

  // get the user list
  chrome.storage.sync.get({
    users: []

  }, function(details) {
    // empty the current list
    $('#emailList').empty();

    if(details.users.length === 0)
      // if you have no friends,
      $('#emailList').append('<p>You currenlty have no people to communicate with.</p>');
    else{
      // otherwise, add each user as a list item in the unordered list
      details.users.forEach(function(user){
        $('#emailList').append('<li>' + user[0] + '</li>');
      });
    }
  });
}

/*
    Clear all users you communicate with from
    the Chrome Storage API
*/
function clearUsers(){
  chrome.storage.sync.set({
      users: []

  }, function() {
    // Update the header to let user know their setting was saved.
    var status = document.getElementById('resetStatus');
    status.textContent = 'Successfully reset email list';

    // After 1.75 seconds, revert the header to it's original text & empty email bar
    setTimeout(function() {
      status.textContent = 'Reset email list:';
    }, 1750);

    // update list of users
    restoreOptions();
  });
}

/*
    Generate and store the User's PGP data
*/
function generateKeys(){
  // take input from the form
  var userEmail = document.getElementById('userEmail').value;
  var passphrase = document.getElementById('passphrase').value;

  // set the options for the generation
  var options = {
    userIds: [{email: userEmail}], // multiple user IDs
    numBits: 2048,                 // RSA key size
    passphrase: passphrase         // protects the private key
  };

  openpgp.generateKey(options).then(function(key) {
    var privkey = key.privateKeyArmored; // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
    var pubkey = key.publicKeyArmored;   // '-----BEGIN PGP PUBLIC KEY BLOCK ... '

    var privKeyObj = openpgp.key.readArmored(privkey).keys[0];

    privKeyObj.decrypt(passphrase);

    // define user object to be stored
    var user = [
      userEmail,
      pubkey,
      privkey,
      passphrase
    ];

    // store the user object to the storage API
    chrome.storage.sync.set({
      user: user
    }, function(){
      restoreOptions();
    });
  });
}

/*
    Helper function to display your Pub Key for sending to your friends
*/
function displayPubKey(){
  chrome.storage.sync.get({
    user: []

  }, function(result){
    $("#pubKey").val(result.user[1]);
  });
}

/*
    Helper function to display the Private Key in case you want to keep it
    elsewhere securely.
*/
function displayPriKey(){
  chrome.storage.sync.get({
    user: []

  }, function(result){
    $("#priKey").val(result.user[2]);
  });
}

// Wait for the page to be loaded, then update the dropdown menu
document.addEventListener("DOMContentLoaded", restoreOptions);

// listener for saving user options
document.getElementById("saveEmail").addEventListener("click", saveUser);

// listener for clearing the user list
document.getElementById("clearUsers").addEventListener("click", clearUsers);
// listener for generating keys
document.getElementById("genKeys").addEventListener("click", generateKeys);

// listeners for displaying the pub & private keys
document.getElementById("displayPubKey").addEventListener("click", displayPubKey);
document.getElementById("displayPriKey").addEventListener("click", displayPriKey);
