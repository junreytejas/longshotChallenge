const puppeteer = require('puppeteer');

async function fetchMessages() {
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

  console.log('Starting Phase 1');
  
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

  console.log('Starting Phase 2');

  let ableToFetch = false;

  try {
    ableToFetch = await page.evaluate(async () => {

      const numRegisters = 16;
      let registers = new Array(numRegisters).fill(0);

      return await new Promise((resolve, reject) => {

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

  if (!ableToFetch) {
    // sometimes the websocket fails to open mainly due to network situation. In this case, we retry
    await browser.close();
    fetchMessages();
  }

}

fetchMessages().catch(error => {
  console.error('Error:', error);
});



/**
 * final output was:
 * 
 * Correct! Send the following hash along with your name to Longshot: 
 * d50749a1866f88f9cff2bdd137b845170f9623f7645a63efcc55728f63f658ad
 */
