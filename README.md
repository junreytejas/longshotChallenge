## Longshot Challenge

### Objective
To solve the challenges and obtain the passcode at the end of the process.

### Solution Overview
The challenge consisted of two phases:

**Phase 1:**
```bash
URL: https://challenge.longshotsystems.co.uk/go
```
In this phase, the webpage asked for a series of numbers and a name to be entered and submitted. The speed required to manually type the information was unrealistic, indicating that a programmatic approach was necessary. Initially, I attempted this with JavaScript in Google Chrome DevTools snippets, which allowed me to automate the input and submission successfully.

Here’s the initial JavaScript code for Phase 1:
```javascript
(async () => {
    try {
        const fData = await fetch('https://challenge.longshotsystems.co.uk/go').then(res => res.text());

        // Parse the fetched HTML string into a DOM object
        const parser = new DOMParser();
        const doc = parser.parseFromString(fData, 'text/html');

        // Write the fetched content to the current document
        document.open();
        document.write(doc.documentElement.innerHTML); // Use innerHTML
        document.close();

        // Initial setup after the document is fully loaded
        window.onload = function() {
            // Access elements from the new content (if needed)
            const answer = document.getElementById('answer');
            const name = document.getElementById('name');

            // Set values for answer and name inputs (if needed)
            const numberBoxes = Array.from(doc.querySelectorAll('[id^="number-box-"]'));
            const answerValue = numberBoxes.map(box => box.textContent.trim()).join('');

            answer.value = answerValue;
            name.value = 'Junrey Tejas';

            // Call submit function
            submit();
        };
    } catch (error) {
        console.error('Error fetching or processing data:', error);
    }
})();
```


**Phase 2:**
```bash
URL: https://challenge.longshotsystems.co.uk/ok
```
For Phase 2, I initially continued with JavaScript in Chrome snippets but encountered issues detecting page navigation events that were using `window.location()`. I then transitioned to using Puppeteer in Node.js to automate the process.

The solution involves:
- re-writing the Phase 1 solution to use Puppeteer and control a browser.
- Extracting information from the page.
- Handling WebSocket communications.
- Executing commands based on received messages.
- Calculating a Base64 string to send back to the server.

### Setup and Installation
1. **Clone the Repository**
   ```bash
   git clone https://github.com/junreytejas/longshotChallenge.git
   ```

2. **Install Dependencies**
   Ensure you have Node.js installed, then run:
   ```bash
   npm install puppeteer
   ```

### Usage
Run the script using Node.js:
```bash
node page.js
```

### Code Explanation

#### Initial Setup
The code begins by setting up the necessary libraries and initializing an array to hold register values:
```javascript
const puppeteer = require('puppeteer');

const numRegisters = 16;
let registers = new Array(numRegisters).fill(0);
```

#### Main Function: `fetchMessages`
The `fetchMessages` function is the core of the solution, orchestrating the browser automation and communication handling:
```javascript
async function fetchMessages() {

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://challenge.longshotsystems.co.uk/go');

  // Gather the answers for phase 1
  const encodedMessages = [];

  const htmlDom = await page.evaluate(() => {
    return document.querySelector('.number-panel').textContent.trim().replace(/\s+/g, '');
  });

  // Assign name
  await page.$eval("#name", element => element.value = "Junrey Tejas");

  // Assign the numbers
  await page.$eval('#answer', (element, text) => {
    element.value = text;
  }, htmlDom);

  // Call submit()
  await page.$eval(".answer-panel button", buttonElement => buttonElement.click());

  // Wait for 2 page navigations
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

  // Decode the messages from the WebSocket
  const decodedMessages = readAndDecodeMessages(encodedMessages);

  // Loop through the commands and execute
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
    console.log('Response received:', response);
  }).catch((error) => {
    console.error('Error sending WebSocket frame:', error);
  }).finally(() => {
    console.log("Completed execution.");
  });

  client.on('Network.webSocketFrameReceived', ({ response }) => {
    console.log('WebSocket message received:', response);
  });
}
```

#### Supporting Functions
Several supporting functions help decode messages and execute commands:

**Decoding Base64 Messages:**
The `decodeBase64` function decodes Base64 encoded messages:
```javascript
function decodeBase64(encodedMessage) {
  const decodedMessage = atob(encodedMessage);
  return decodedMessage;
}
```

**Reading and Decoding Messages:**
The `readAndDecodeMessages` function processes an array of messages, decoding each one:
```javascript
function readAndDecodeMessages(messages) {
  try {
    const decodedMessages = messages.map(encodedMessage => {
      const cleanedMessage = encodedMessage.replace(/^ok:10 /, '').trim();
      return decodeBase64(cleanedMessage);
    });
    return decodedMessages;
  } catch (err) {
    console.error('Error decoding messages:', err);
    return [];
  }
}
```

**Command Execution:**
The `executeCommand` function breaks down instructions and executes the appropriate operation:
```javascript
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
      console.error(`Unknown instruction: ${command}`);
  }

  console.log({instruction: command},{registers});
}

function addCommand(parts) {
  const value = parseInt(parts[1]);
  const srcReg = parseInt(parts[2].substring(1));
  const destReg = parseInt(parts[3].substring(1));

  registers[destReg] = registers[srcReg] + value;
}

function moveCommand(parts) {
  const srcReg = parseInt(parts[1].substring(1));
  const destReg = parseInt(parts[2].substring(1));

  registers[destReg] = registers[srcReg];
}

function storeCommand(parts) {
  const value = parseInt(parts[1]);
  const destReg = parseInt(parts[2].substring(1));

  registers[destReg] = value;
}
```

### Execution
Finally, the program is executed by calling the `fetchMessages` function:
```javascript
fetchMessages();
```

### Conclusion
With this approach, I was able to successfully automate the interaction with the challenge webpage, handle WebSocket communications, decode and process these commands, and ultimately calculate a Base64 string which is sent back to the server. Each step is handled with detailed logging to ensure transparency and ease of debugging.
