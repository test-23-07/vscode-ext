// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.

// Sobald das hier läuft, sollten wir die Datei dynamisch laden
let data = { "repo": "blah",
  "introduction": "Eure Aufgabe ist es, eine YAML-Datei namens test.yaml zu erstellen",
  "logo_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Tic_tac_toe.svg/640px-Tic_tac_toe.svg.png",
  "timeframe":"30 Minuten (Viel Erfolg!)",
  "tests": [

     {
      "specs": {"title":"YAML Datei erstellen"},
      "name": "checking your YAML file",
      "feedback": "YAML error",
      "urls":[""],
      "keywords": [""],
      "type": "YAML",
      "run": ".name",
      "file": "test.yaml",
      "output": "Boris",
      "comparison": "exact",
      "points": 5
    },
     {
      "specs": {"title":"CFN Template erstellen"},
      "name": "checking your CFN file",
      "feedback": "CFN error",
      "urls":[""],
      "keywords": [""],
      "type": "CFN",
      "run": "validate",
      "file": "template.yaml",
      "output": "",
      "comparison": "",
      "points": 5
    }
]
};

function setViewConfig(){
    document.getElementById("config").style.visibility = "visible";
    document.getElementById("tests").style.visibility = "hidden";
}

function setViewTests(){
    document.getElementById("config").style.visibility = "hidden";
    document.getElementById("tests").style.visibility = "visible";
}

window.addEventListener('DOMContentLoaded', event => 
{
    
    console.log("DOMContentLoaded");
    setViewConfig();
    const vscode = acquireVsCodeApi();

    const oldState = /** @type {{ count: number} | undefined} */ (vscode.getState());
        
        for (const key of Object.keys(data)) {
            temp = /** @type {HTMLInputElement} */ document.getElementById(key);
            if(!temp) {
                continue;
            }
            temp.value = data[key];
            //console.log(key);
          }

    /*
    setInterval(() => {
        counter.textContent = `${currentCount++} `;

        // Update state
        vscode.setState({ count: currentCount });

        // Alert the extension when the cat introduces a bug
        if (Math.random() < Math.min(0.001 * currentCount, 0.05)) {
            // Send a message back to the extension
            vscode.postMessage({
                command: 'alert',
                text: '🐛  on line ' + currentCount
            });
        }
    }, 100);
    */
});

// Function to update the JSON data with values from the form
function updateJSON(n) {
    //FIXME: Wir können hier auch ne loop verwenden ...
    jsonData[n].specs.title = document.getElementById('title').value;
    jsonData[n].name = document.getElementById('name').value;
    jsonData[n].feedback = document.getElementById('feedback').value;
    jsonData[n].urls = document.getElementById('urls').value.split(',');
    jsonData[n].keywords = document.getElementById('keywords').value.split(',');
    jsonData[n].type = document.getElementById('type').value;
    jsonData[n].run = document.getElementById('run').value;
    jsonData[n].file = document.getElementById('file').value;
    jsonData[n].output = document.getElementById('output').value;
    jsonData[n].comparison = document.getElementById('comparison').value;
    jsonData[n].points = parseInt(document.getElementById('points').value, 10);
}