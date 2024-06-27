document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");

    const violationsContainer = document.getElementById('violations-container');
    const resetButton = document.getElementById('resetButton');
    const urlInput = document.getElementById('urlInput');
    const refreshButton = document.getElementById('refreshButton');

    function loadViolations(filterUrl = '') {
        chrome.storage.local.get({ violations: {} }, (result) => {
            const allViolations = result.violations;
            violationsContainer.innerHTML = '';
            console.log("Loaded violations from localStorage:", allViolations);

            const groupedByHostname = {};

            Object.keys(allViolations).forEach((url) => {
                const urlObj = new URL(url);
                const hostname = urlObj.hostname;
                const pathname = urlObj.pathname;

                if (!groupedByHostname[hostname]) {
                    groupedByHostname[hostname] = {};
                }

                if (!groupedByHostname[hostname][pathname]) {
                    groupedByHostname[hostname][pathname] = [];
                }

                groupedByHostname[hostname][pathname].push(...allViolations[url]);
            });
            console.log('Grouped by hostname:', groupedByHostname);

            Object.keys(groupedByHostname).forEach((hostname, hostnameIndex) => {
                const hostnameDiv = document.createElement('div');
                hostnameDiv.id = `hostname-${hostnameIndex}`;
                hostnameDiv.className = 'rounded-lg shadow-xl p-4 mb-4 bg-gray-300 border border-black';
                hostnameDiv.innerHTML = `<div class="flex flex-row items-center gap-3 mb-2">
                                        <h2 class="text-xl font-bold">Host: ${escapeHtml(hostname)}</h2>
                                         <br> <button class="rounded-lg bg-green-500 text-white p-2 hover:scale-105 duration-300" id="report-${hostnameIndex}")">Generate Report</button>
                                         </div>
                                         `;

                Object.keys(groupedByHostname[hostname]).forEach((pathname, pathnameIndex) => {
                    const urlViolations = groupedByHostname[hostname][pathname];
                    let accessibilityScore = (urlViolations[0][0].accessibilityScore).toFixed(2);

                    const pathnameDiv = document.createElement('div');
                    pathnameDiv.id = `pathname-${hostnameIndex}-${pathnameIndex}`;
                    pathnameDiv.className = 'rounded-lg shadow-xl p-4 mb-4 bg-gray-200 border border-black';
                    pathnameDiv.innerHTML = `<strong class="text-xl">Path:<strong> <div class="text-lg font-bold">${escapeHtml(pathname)}</div>
                                             <br> 
                                             <strong class="text-xl">Accessibility Score:</strong> <div id="score-${hostname}-${pathnameIndex}" style="color:black" class="text-lg font-bold">${accessibilityScore} / 100 </div>`;

                    const violationDivIndex = document.createElement('div');
                    violationDivIndex.id = `violation-details-${hostnameIndex}-${pathnameIndex}`;
                    violationDivIndex.style.display = 'none';

                    urlViolations.forEach((violationData, violationIndex) => {
                        violationData.forEach((violation, vIndex) => {
                            const violationElement = document.createElement('div');
                            violationElement.className = 'violation rounded-lg shadow-xl';
                            violationElement.innerHTML = `
                                <strong>ElementURL:</strong> <a href="${escapeHtml(violation.url)}" class="underline text-blue-500" target="_blank">${escapeHtml(violation.url)}</a><br>
                                <strong>Message:</strong> ${escapeHtml(violation.message)}<br>
                                <strong>Impact:</strong> ${escapeHtml(violation.impact)}<br>
                                <strong>Count:</strong> ${violation.count}<br>
                                <strong>Rule:</strong> <a href="${escapeHtml(violation.helpUrl)}" class="underline text-blue-500" target="_blank">${escapeHtml(violation.rule)}</a><br>
                                <strong>Tags:</strong> ${violation.tags.join(', ')}<br>
                                <strong>Violation Detail:</strong><br>${escapeHtml(violation.nodes[0].reason).replace(/\n/g, '<br>')}<br><br>
                                <div class="bg-white p-2 rounded-lg shadow-xl flex flex-col">
                                    <div id="elements-${hostnameIndex}-${pathnameIndex}-${violationIndex}-${vIndex}" class="flex flex-row items-center cursor-pointer elements-div">
                                        <img src="right-arrow.svg" id="arrow-${hostnameIndex}-${pathnameIndex}-${violationIndex}-${vIndex}" class="arrow" style="width: 15px; height: 15px; margin-right: 5px;">
                                        <strong class="flex items-center">Elements</strong>
                                    </div>
                                    <ul class="node-list mt-2" style="display:none" id="node-${hostnameIndex}-${pathnameIndex}-${violationIndex}-${vIndex}">
                                        ${violation.nodes.map((node, nodeIndex) => `
                                            <li id="node-item-${hostnameIndex}-${pathnameIndex}-${violationIndex}-${vIndex}-${nodeIndex}" class="node-item cursor-pointer flex flex-col bg-gray-200 rounded-lg shadow-lg p-2 mb-2 gap-3">
                                                <div class="flex flex-row items-center">
                                                    <img src="right-arrow.svg" id="node-arrow-${hostnameIndex}-${pathnameIndex}-${violationIndex}-${vIndex}-${nodeIndex}" class="arrow" style="width: 10px; height: 10px; margin-right: 5px;">
                                                    ${escapeHtml(node.target.join(', '))}
                                                </div>
                                                <div id="node-html-${hostnameIndex}-${pathnameIndex}-${violationIndex}-${vIndex}-${nodeIndex}" class="node-html code-block shadow-xl" style="display:none;">
                                                    <pre><code>${escapeHtml(node.html)}</code></pre>
                                                </div>
                                            </li>
                                        `).join('')}
                                    </ul>
                                </div>
                            `;
                            violationDivIndex.appendChild(violationElement);
                        });
                    });

                    pathnameDiv.appendChild(violationDivIndex);
                    hostnameDiv.appendChild(pathnameDiv);

                    violationsContainer.appendChild(hostnameDiv);

                    

                    const scoreDiv = document.getElementById(`score-${hostname}-${pathnameIndex}`);
                    console.log('Score div:', scoreDiv);
                    if(scoreDiv){
                        // console.log('Score div found');
                        if (accessibilityScore > 80){
                            scoreDiv.style.color = 'green';
                        }
                        else if (accessibilityScore > 60){
                            scoreDiv.style.color = 'GoldenRod';
                        }
                        else{
                            scoreDiv.style.color = 'red';
                        }
                    }

                    pathnameDiv.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const detailsDiv = document.getElementById(`violation-details-${hostnameIndex}-${pathnameIndex}`);
                        if (detailsDiv.style.display === 'none') {
                            detailsDiv.style.display = 'block';
                        } else {
                            detailsDiv.style.display = 'none';
                        }
                    });

                    urlViolations.forEach((violationData, violationIndex) => {
                        violationData.forEach((violation, vIndex) => {
                            const elementsDiv = document.getElementById(`elements-${hostnameIndex}-${pathnameIndex}-${violationIndex}-${vIndex}`);
                            const nodeList = document.getElementById(`node-${hostnameIndex}-${pathnameIndex}-${violationIndex}-${vIndex}`);
                            const arrow = document.getElementById(`arrow-${hostnameIndex}-${pathnameIndex}-${violationIndex}-${vIndex}`);

                            if (elementsDiv && nodeList && arrow) {
                                elementsDiv.addEventListener('click', (e) => {
                                    e.stopPropagation(); 
                                    console.log('Elements clicked');
                                    if (nodeList.style.display === 'none') {
                                        nodeList.style.display = 'block';
                                        arrow.style.transform = 'rotate(90deg)';
                                    } else {
                                        nodeList.style.display = 'none';
                                        arrow.style.transform = 'rotate(0deg)';
                                    }
                                });
                            }

                            violation.nodes.forEach((node, nodeIndex) => {
                                const nodeItem = document.getElementById(`node-item-${hostnameIndex}-${pathnameIndex}-${violationIndex}-${vIndex}-${nodeIndex}`);
                                const nodeArrow = document.getElementById(`node-arrow-${hostnameIndex}-${pathnameIndex}-${violationIndex}-${vIndex}-${nodeIndex}`);
                                const nodeHtml = document.getElementById(`node-html-${hostnameIndex}-${pathnameIndex}-${violationIndex}-${vIndex}-${nodeIndex}`);

                                if (nodeItem && nodeArrow && nodeHtml) {
                                    nodeItem.addEventListener('click', (e) => {
                                        e.stopPropagation(); 
                                        console.log('Node item clicked');
                                        if (nodeHtml.style.display === 'none' || nodeHtml.style.display === '') {
                                            nodeHtml.style.display = 'block';
                                            nodeArrow.style.transform = 'rotate(90deg)';
                                        } else {
                                            nodeHtml.style.display = 'none';
                                            nodeArrow.style.transform = 'rotate(0deg)';
                                        }
                                    });
                                }
                            });
                        });
                    });
                });
                const reportButton = document.getElementById(`report-${hostnameIndex}`);
                reportButton.addEventListener('click', () => generateReport(groupedByHostname[hostname]));

                // violationsContainer.appendChild(hostnameDiv);
            });
        });
    }

    function resetViolations() {
        chrome.storage.local.set({ violations: {}, URLS: [] }, loadViolations);
    }

    refreshButton.addEventListener('click', () => location.reload());

    resetButton.addEventListener('click', resetViolations);
    urlInput.addEventListener('input', () => loadViolations(urlInput.value));

    loadViolations();
});

function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function generateReport(hostname) {
    const reportData = [];
    const allPathnames = hostname;

    Object.keys(allPathnames).forEach((pathname) => {
        const pathData = allPathnames[pathname];
        pathData.forEach((violationData) => {
            violationData.forEach((violation) => {
                const violationEntry = {
                    url: pathname,  
                    message: violation.message,
                    impact: violation.impact,
                    count: violation.count,
                    rule: violation.rule,
                    helpUrl: violation.helpUrl,
                    reason: violation.nodes[0].reason,
                    elements: violation.nodes.map(node => node.target.join(', ')).join('; '),
                    html: violation.nodes.map(node => node.html).join('\n\n')
                };
                reportData.push(violationEntry);
            });
        });
    });

    console.log("Report Data:", reportData);

    if (reportData.length === 0) {
        alert("No data available to generate the report.");
        return;
    }

    let csvContent = Object.keys(reportData[1]).join(",") + "\n";

    reportData.forEach((row, index) => {
        console.log(`Processing row ${index + 1} of ${reportData.length}`);
        const rowString = Object.values(row)
            .map(value => `"${String(value).replace(/"/g, '""')}"`)
            .join(",");
        console.log(`Row ${index + 1}: ${rowString}`);
        csvContent += rowString + "\n";
    })

    // Loop through reportData to build the CSV string
    // reportData.forEach((row, index) => {
    //     console.log(`Processing row ${index + 1} of ${reportData.length}`);
    //     const rowString = Object.values(row)
    //         .map(value => `"${String(value).replace(/"/g, '""')}"`)
    //         .join(",");
    //     console.log(`Row ${index + 1}: ${rowString}`);
    //     csvContent += rowString + "\n";
    // });

    console.log("CSV Content:", csvContent);


    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8,' })
    const objUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', objUrl)
    link.setAttribute('download', `violations.csv`)
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
