// Inbox SDK - this key is bound to my Google account, please don't misuse it :(
InboxSDK.load('1.0', 'sdk_gmailencrypt_cdcb10e632').then(function(sdk){

  /*
    Handler for interacting with composing an email in Gmail
  */
  sdk.Compose.registerComposeViewHandler(function(composeView){
    // a compose view has come into existence, do something with it!
    composeView.addButton({
      title: "Encrypt message",
      // I do not own this image or claim to, it was just nice and fit the project
      iconUrl: 'https://pbs.twimg.com/profile_images/599482221402161152/ZIUk-8TB.png',
      onClick: function(event) {
        // store all recipients' email addresses to a set

        // was using sets for managing encrypting the message to multiple people
        // removed this functionality for the final version
        var recipient = new Set();

        // email used for comparison
        var userEmail = null;

        // currently only allows recipient to be in the mail TO field
        event.composeView.getToRecipients().forEach(function(element) {
          recipient.add(element.emailAddress);
          userEmail = element.emailAddress;
        });

        // was collecting recepients from CC (unused)
        event.composeView.getCcRecipients().forEach(function(element) {
          recipient.add(element.emailAddress);
        });

        // was collecting recepients from BCC (unused)
        event.composeView.getBccRecipients().forEach(function(element) {
          recipient.add(element.emailAddress);
        });

        // text to be encrypted
        var bodyText = event.composeView.getHTMLContent();

        //
        chrome.storage.sync.get({
          users: []
        }, function(result){
          // get list of users you can communicate with
          var users = result.users;

          // pre-define the pub key
          var userPubKey = null;

          // check our user list for a matching email
          users.forEach(function(array) {
            // if we find it, set our user's pub key to this
            // we need it to encrypt the email
            if(userEmail === array[0]){
              userPubKey = array[1];
            }
          });

          // if we found a matching email...
          if(userPubKey !== null){

            // get our information, as we need to sign our email with our priKey
            chrome.storage.sync.get({
              user: []
            }, function(result){
              var user = result.user;

              // if our data is set...
              if(user.length > 0){
                // get our keys
                var pubKey = user[1];
                var privateKey = user[2];

                // decrypt our priKeyObj so we can sign with it
                var privKeyObj = openpgp.key.readArmored(privateKey).keys[0];
                privKeyObj.decrypt(user[3]);

                // set our options
                options = {
                  data: bodyText,
                  publicKeys: openpgp.key.readArmored(pubKey).keys,
                  privateKeys: privKeyObj
                };

                // encrypted the message
                openpgp.encrypt(options).then(function(ciphertext) {
                  encrypted = ciphertext.data;

                  // set the body of the email to be our encrypted data
                  event.composeView.setBodyText(encrypted);
                });
              }
            });
          }else{
            // if we can't find the contact, alert the user and exit
            alert("Error: recipient not in contact list");
          }
        });
      },
    });
  });
  // END composeView HANDLER

  /*
    Handler for interacting with message threads in Gmail
  */
  sdk.Conversations.registerMessageViewHandler(function(MessageView){

    // create a 'Decrypt' button within each email in a thread
    MessageView.addToolbarButton({
      // required, bottom of list
      section: 'MORE',
      // button title
      title: 'Decrypt',
      // onClick, begin decrypting function
      onClick: function(){
        // get the user's
        chrome.storage.sync.get({
          user: []
        }, function(result){
          var user = result.user;

          // if the user has set their keys...
          if(user.length > 0){
            // get user keys
            var pubKey = user[1];
            var privateKey = user[2];

            // get the body of the Email
            var body = MessageView.getBodyElement();
            // get the ID of the body elemenet
            var messageID = body.attributes.id.value;
            // use this ID to get the body element in JS
            var element = document.getElementById(messageID);

            // the child of this element will always be the email data
            // learned this by parsing through multiple emails and finding the pattern
            // I'll use this later to replace the body of the email with the unencrypted content
            var actualEmail = element.childNodes[0];

            // remove the HTML tags from the email data, as we only want the raw PGP encrypted text
            var encryptedText = $(element).text();

            // get the private key object and decrypt it so we can use it for signing
            var privKeyObj = openpgp.key.readArmored(privateKey).keys[0];
            privKeyObj.decrypt(user[3]);

            // declare options for the decryption
            options = {
              message: openpgp.message.readArmored(encryptedText),     // parse armored message
              publicKeys: openpgp.key.readArmored(pubKey).keys,    // for verification (optional)
              privateKey: privKeyObj // for decryption
            };

            // decrypt the email
            openpgp.decrypt(options).then(function(plaintext) {
              // get result of decryption
              var decryptedData = plaintext.data;

              // use the actualEmail's ID we defined earlier to get the
              // DOM element we need to insert our decryptedData to replace
              // the PGP encrypted content
              document.getElementById(actualEmail.id).innerHTML = decryptedData;
            });
          }else{
            // user has not setup their details, alert them to this.
            alert("You don't have a private key assosiated with your account");
          }
        });
      }
    });
  });
  // END MessageView HANDLER

});
