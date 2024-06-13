const { Buffer } = require('buffer');
const puppeteer = require('puppeteer');

const numRegisters = 16;
let registers = new Array(numRegisters).fill(0);


 async function fetchMessages (){

  const encodedMessages = [];

  const browser = await puppeteer.launch({ headless: false });

  const page = await browser.newPage();

  await page.goto('https://challenge.longshotsystems.co.uk/go');

  // gather the answers for phase 1
  const htmlDom = await page.evaluate(() => {
    return document.querySelector('.number-panel').textContent.trim().replace(/\s+/g, '');
  });

    // assign name
    await page.$eval("#name", element => element.value = "Junrey Tejas");


  // assign the numbers
  await page.$eval('#answer', (element, text) => {
    element.value = text;
  }, htmlDom);


  // call submit()
  await page.$eval(".answer-panel button", buttonElement => buttonElement.click());

  // wait 2 page navigations
  await page.waitForNavigation();
  await page.waitForNavigation();

  // Set up WebSocket listener
  const client = await page.createCDPSession();
  await client.send('Network.enable');

  client.on('Network.webSocketFrameReceived', ({ response }) => {
    const { payloadData } = response;
    encodedMessages.push(payloadData);
  });

  // Wait for messages
  await page.evaluate(() => {
    return new Promise(resolve => {
      setTimeout(resolve, 2000);
    });
  });


  // decode the messages from the websocket
  const decodedMessages = readAndDecodeMessages(encodedMessages);

  // loop through the commands and execute
  decodedMessages.forEach(command => {
    executeCommand(command);
  });

  // Calculate sum of registers
  const sum = registers.reduce((acc, curr) => {
    console.log(`Accumulator: ${acc}, Current Value: ${curr}`);
    return acc + curr;
  }, 0);

  // Encode the sum of registers in Base64
  const encodedBase64 = btoa(sum)
  console.log('Encoded Base64:', encodedBase64);

  // Send the encodedBase64 to the WebSocket
  await client.send('Network.webSocketFrameSent', encodedBase64).then((response) => {
    // Handle the response here
    console.log('Response received:', response);
  }).catch((error) => {
    // Handle any errors that occur during sending or receiving the frame
    console.error('Error sending WebSocket frame:', error);
  }).finally(
    console.log("completed execution.")
  )

  client.on('Network.webSocketFrameReceived', ({ response }) => {

    console.log('WebSocket message received:', response);
 
  });

};

// Function to decode Base64 encoded messages
function decodeBase64(encodedMessage) {
  const decodedMessage = atob(encodedMessage)
  return decodedMessage;
}

// Function to read and decode messages from an array
function readAndDecodeMessages(messages) {
  try {
    const decodedMessages = messages.map(encodedMessage => {
      // Remove "ok:10 " prefix and trim if necessary
      const cleanedMessage = encodedMessage.replace(/^ok:10 /, '').trim();
      return decodeBase64(cleanedMessage);
    });
    return decodedMessages;
  } catch (err) {
    console.error('Error decoding messages:', err);
    return [];
  }
}

// break down the instructions and decipher the operation
function executeCommand(command) {
  const parts = command.replace(/"/g, '').split(' ');
  const opcode = parts[0];

  switch (opcode) {
    case 'ADD':
      addCommand(parts);
      break;
    case 'MOV':
      moveCommand(parts);
      break;
    case 'STORE':
      storeCommand(parts);
      break;
    default:
      // for instructions that are not in correct format
      console.error(`Unknown instruction: ${command}`);
  }

  // log the updated results after the operation for tracking
  console.log({instruction: command},{registers})

}

function addCommand(parts) {
  const value = parseInt(parts[1]); // extract the value
  const srcReg = parseInt(parts[2].substring(1)); // Extract source number
  const destReg = parseInt(parts[3].substring(1)); // Extract destination number

  registers[destReg] = registers[srcReg] + value;
}


function moveCommand(parts) {
  const srcReg = parseInt(parts[1].substring(1)); // Extract source number
  const destReg = parseInt(parts[2].substring(1)); // Extract destination number

  registers[destReg] = registers[srcReg];
}


function storeCommand(parts) {
  const value = parseInt(parts[1]);
  const destReg = parseInt(parts[2].substring(1)); // Extract destination number to overide

  registers[destReg] = value;
}


// start the program
fetchMessages()