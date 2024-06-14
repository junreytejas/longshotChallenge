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

        const parser = new DOMParser();
        const doc = parser.parseFromString(fData, 'text/html');

        // Write the fetched content to the current document
        document.open();
        document.write(doc.documentElement.innerHTML); // Use innerHTML
        document.close();

        // Initial setup after the document is fully loaded
        window.onload = function() {
            // Access elements from the new content 
            const answer = document.getElementById('answer');
            const name = document.getElementById('name');

            // Set values for answer and name inputs 
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
The code begins by setting up the puppeteer library:
```javascript
const puppeteer = require('puppeteer');
```

#### Main Function: `fetchMessages`
The `fetchMessages` function is the core of the solution wraps the entire web scraping logic/commands:
```javascript
async function fetchMessages() 
```

#### Setting up our puppeteer environment
```javascript
const browser = await puppeteer.launch({
    headless: false,
    args: ['--disable-gpu', '--disable-dev-shm-usage', '--no-sandbox']
  });

  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.resourceType() === 'image' || req.resourceType() === 'stylesheet') {
      req.abort();
    } else {
      req.continue();
    }
  });
```
#### Phase 1: 
Automates capturing the data from the dom, filling up the 'answer' and 'name' fields in the form, and then hitting the submit button 
```javascript
  await page.goto('https://challenge.longshotsystems.co.uk/go');

  const htmlDom = await page.evaluate(() => {
    return document.querySelector('.number-panel').textContent.trim().replace(/\s+/g, '');
  });

  await page.$eval("#name", element => element.value = "Junrey Tejas");
  await page.$eval('#answer', (element, text) => {
    element.value = text;
  }, htmlDom);
  await page.$eval(".answer-panel button", buttonElement => buttonElement.click());

  await page.waitForNavigation();
  await page.waitForNavigation();
```
#### Phase 2: 
Listen and decode the websocket messages, execute the commands to update the registers, then sum the registers. 
```javascript
  let ableToFetch = false;

  try {
    ableToFetch = await page.evaluate(async () => {
```
Initialize the registers using Array and fill them with zero values
```javascript
      const numRegisters = 16;
      let registers = new Array(numRegisters).fill(0);

      return await new Promise((resolve, reject) => {
```
Added event listener for websocket incoming message
1. decodes the received message
2. check if the message contains "END"
3. if it does:
   - sum the registers using `reduce()` function
   - encode the result back to Base64
   - send it back to the websocket
4. if it doesn't:
   - pass the decoded message and registers to the `executeCommand` function
```javascript
        window.ws.onmessage = function (event) {

          const decodedMessage = atob(event.data).trim()

          console.log(decodedMessage)

          if (decodedMessage.toString() == "\"END\"") {
            console.log("processing end message.")
            const sum = registers.reduce((acc, curr) => acc + curr, 0);

            const encodedBase64 = btoa(sum.toString());

            console.log('Encoded Base64:', encodedBase64, sum);

            window.ws.send(encodedBase64)
          } else {
            console.log("executing command")
            executeCommand(decodedMessage, registers)
          }

          resolve(true);

        };

        window.ws.onclose = function (CloseEvent) {
          console.log(CloseEvent);
          reject('WebSocket closed. Code: ' + CloseEvent.code);
        };

      });
```
This `executeComand()` function processes the command string and updates the registers
```javascript
      function executeCommand(command, registers) {
        const parts = command.replace(/"/g, '').split(' ');
        const opcode = parts[0];

        switch (opcode) {
          case 'ADD':
            addCommand(parts, registers);
            break;
          case 'MOV':
            moveCommand(parts, registers);
            break;
          case 'STORE':
            storeCommand(parts, registers);
            break;
          default:
            // console.error(`Unknown instruction: ${command}`);
        }
      }

      function addCommand(parts, registers) {
        const value = parseInt(parts[1]); // Extract the value
        const srcReg = parseInt(parts[2].substring(1)); // Extract source number
        const destReg = parseInt(parts[3].substring(1)); // Extract destination number

        registers[destReg] = registers[srcReg] + value;
      }

      function moveCommand(parts, registers) {
        const srcReg = parseInt(parts[1].substring(1)); // Extract source number
        const destReg = parseInt(parts[2].substring(1)); // Extract destination number

        registers[destReg] = registers[srcReg];
      }

      function storeCommand(parts, registers) {
        const value = parseInt(parts[1]);
        const destReg = parseInt(parts[2].substring(1)); // Extract destination number to override

        registers[destReg] = value;
      }

    });
  } catch (error) {
    console.error('Error:', error);
  }
```
sometimes the websocket fails to open mainly due to network situation. In this case, we retry
```javascript
  if (!ableToFetch) {
    await browser.close();
    fetchMessages();
  }
```

### Resulting Data from the challenge
`Correct! Send the following hash along with your name to Longshot: 
d50749a1866f88f9cff2bdd137b845170f9623f7645a63efcc55728f63f658ad`


### Conclusion
With this approach, I was able to successfully automate the interaction with the challenge webpage, handle WebSocket communications, decode and process these commands, and ultimately calculate a Base64 string which is sent back to the server. Each step is handled with detailed logging to ensure transparency and ease of debugging.
