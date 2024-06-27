let testButton = document.getElementById('testbutton');
let refreshButton = document.getElementById('refreshbutton');
let copyButton = document.getElementById('copybutton');
let openTabButton = document.getElementById('opentabbutton');


openTabButton.addEventListener("click", () => {
    window.open('violations.html', '_blank');
});

refreshButton.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.reload(tabs[0].id);
    });
    location.reload();
});

copyButton.addEventListener("click", () => {
    const violationText = document.getElementById('violation').innerText;
    copyToClipboard(violationText);
});

testButton.addEventListener("click", async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["./node_modules/axe-core/axe.min.js"]
    }).then(() => {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: testFunction
        });
    });
});

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert("Copied to clipboard!");
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

function testFunction() {
    if (window.axeTestRan) {
        alert('Accessibility test has already been run. Please refresh the page to run the test again.');
        return;
    }

    window.axeTestRan = true;

    const highlightStyles = `
        .ui-highlight {
            position: relative;
            outline: 2px solid red;
            background-color: rgba(255, 0, 0, 0.1);
            cursor: pointer;
        }
    `;

    const style = document.createElement('style');
    style.textContent = highlightStyles;
    document.head.append(style);

    let count = 0;
    let failedElements = 0;
    let totalRules = 0;
    let passedRules = 0;
    const url = window.location.href;

    axe.run(document, (err, results) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(results);

        totalRules = results.passes.length + results.incomplete.length + results.violations.length;
        passedRules = results.passes.length + results.incomplete.length;
        const accessibilityScore = (passedRules / totalRules) * 100;

        const violationsData = results.violations.map(violation => {
            console.log(violation);
            let message = violation.description;
            let impact = violation.impact;
            let rule = violation.id;
            let tags = violation.tags;
            let helpUrl = violation.helpUrl;
            count++;
            //console.log(violation.nodes[0].html);
            chrome.runtime.sendMessage({ type: 'violation', violation: message, impact: impact, count: count });
            return {
                accessibilityScore: accessibilityScore,
                url: url,
                rule: rule,
                message: message,
                impact: impact,
                tags: tags,
                helpUrl: helpUrl,
                count: violation.nodes.length,
                nodes: violation.nodes.map(node => {
                    return {
                        target: node.target,
                        reason: node.failureSummary,
                        html: node.html
                    };
                })
            };
        });

        storeViolations(url,[violationsData]);

        results.violations.forEach(violation => {
            violation.nodes.forEach(node => {
                const selector = node.target.join(',');
                let reason = node.failureSummary;
                const elements = document.querySelectorAll(selector);
                //console.log(elements);
                elements.forEach(element => {
                    if (!element.classList.contains('ui-highlight')) {
                        failedElements++;
                        element.classList.add('ui-highlight');
                        element.title = reason;
                    }
                });
            });
        });

        chrome.runtime.sendMessage({ type: 'update-count', count: count, failedElements: failedElements, totalRules: totalRules, passedRules: passedRules});
    });

    function storeViolations(url, violationsData) {
        chrome.storage.local.get({ violations: {} }, (result) => {
            let violations = result.violations;
            if (!violations[url]) {
                violations[url] = [];
            }
            violations[url].push(...violationsData);
            chrome.storage.local.set({ violations: violations }, () => {
                console.log(`Violations stored successfully for ${url}:`, violations[url]);
            });
        });
    }
    
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'update-count') {
        let violationCountContainer = document.getElementById('violation-count-container');
        let violationCount = document.getElementById('violation-count');

        violationCount.innerHTML =`
           ${message.count} <strong>Violations in</strong> ${message.failedElements} <strong>elements</strong><br>
            <strong>Score:</strong> ${message.passedRules}<strong>/</strong>${message.totalRules}<br>
            `
        if (message.count > 0) {
            violationCountContainer.classList.add('show');
        } else {
            violationCountContainer.classList.remove('show');
        }
    }
    if (message.type === 'violation') {
        let violationContainer = document.getElementById('violation-container');
        let violation = document.getElementById('violation');
        let text = document.createTextNode(message.count + " - " + message.violation + ' - Violation with ' + message.impact + ' Impact');
        violation.appendChild(text);
        violation.appendChild(document.createElement('br'));
        violation.appendChild(document.createElement('br'));

        violationContainer.classList.add('show');
    }
});
