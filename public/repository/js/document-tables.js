// public/repository/js/document-tables.js

window.initTableResizer = function(editor) {
    let startX, startWidth, activeCell = null;
    
    editor.addEventListener('mousemove', (e) => {
        if (e.target.tagName === 'TD' || e.target.tagName === 'TH') {
            const cell = e.target;
            const rect = cell.getBoundingClientRect();
            if (e.clientX > rect.right - 8 && e.clientX < rect.right + 2) {
                cell.style.cursor = 'col-resize';
            } else {
                cell.style.cursor = '';
            }
        }
    });
    
    editor.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'TD' || e.target.tagName === 'TH') {
            const cell = e.target;
            const rect = cell.getBoundingClientRect();
            if (e.clientX > rect.right - 8 && e.clientX < rect.right + 2) {
                activeCell = cell;
                startX = e.clientX;
                startWidth = cell.offsetWidth;
                e.preventDefault();
                
                const onMouseMove = (moveEvent) => {
                    if (!activeCell) return;
                    const diff = moveEvent.clientX - startX;
                    const newWidth = Math.max(30, startWidth + diff);
                    activeCell.style.width = newWidth + 'px';
                    activeCell.setAttribute('width', newWidth);
                    
                    const table = activeCell.closest('table');
                    if (table) {
                        table.style.tableLayout = 'fixed';
                    }
                };
                
                const onMouseUp = () => {
                    activeCell = null;
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            }
        }
    });
};

window.insertTable = function() {
    const activeBlock = getActiveBlock();
    if (!activeBlock) return;
    const rows = prompt("Number of rows:", "3");
    const cols = prompt("Number of columns:", "3");
    if (!rows || !cols) return;
    
    let html = '<table class="table table-bordered" style="width:100%; border-collapse:collapse; margin-bottom:1rem;"><tbody>';
    for(let r=0; r<rows; r++) {
        html += '<tr>';
        for(let c=0; c<cols; c++) {
            html += '<td style="border:1px solid #ccc; padding:8px;">&nbsp;</td>';
        }
        html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';
    document.execCommand('insertHTML', false, html);
};

window.toggleBorders = function() {
    if (!getActiveBlock()) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    let node = sel.getRangeAt(0).startContainer;
    while(node && node.nodeName !== 'TABLE' && node.nodeName !== 'BODY') {
        node = node.parentNode;
    }
    if (node && node.nodeName === 'TABLE') {
        node.classList.toggle('table-bordered');
        if (node.style.borderCollapse === 'collapse') {
            node.style.borderCollapse = 'unset';
            node.querySelectorAll('td, th').forEach(cell => cell.style.border = 'none');
        } else {
            node.style.borderCollapse = 'collapse';
            node.querySelectorAll('td, th').forEach(cell => cell.style.border = '1px solid #ccc');
        }
    } else {
        alert("Please place your cursor inside a table first.");
    }
};

window.executeTableAction = function(action) {
    const selectEl = document.getElementById('table-actions-select');
    if (!selectEl) return;
    
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    let node = sel.getRangeAt(0).startContainer;
    const cell = node.closest ? node.closest('td, th') : (node.parentNode && node.parentNode.closest ? node.parentNode.closest('td, th') : null);
    if (!cell) {
        alert("Please place your cursor inside a table cell first.");
        selectEl.value = "";
        return;
    }
    
    const row = cell.closest('tr');
    const table = cell.closest('table');
    if (!table || !row) return;

    if (action === 'mergeCenter') {
        const nextCell = cell.nextElementSibling;
        if (nextCell) {
            cell.innerHTML = cell.innerHTML.trim() + " " + nextCell.innerHTML.trim();
            const cellColspan = parseInt(cell.getAttribute('colspan') || '1');
            const nextColspan = parseInt(nextCell.getAttribute('colspan') || '1');
            cell.setAttribute('colspan', cellColspan + nextColspan);
            nextCell.remove();
            cell.style.textAlign = 'center';
        } else {
            const prevCell = cell.previousElementSibling;
            if (prevCell) {
                prevCell.innerHTML = prevCell.innerHTML.trim() + " " + cell.innerHTML.trim();
                const prevColspan = parseInt(prevCell.getAttribute('colspan') || '1');
                const cellColspan = parseInt(cell.getAttribute('colspan') || '1');
                prevCell.setAttribute('colspan', prevColspan + cellColspan);
                cell.remove();
                prevCell.style.textAlign = 'center';
            }
        }
    } else if (action === 'toggleWrap') {
        const isNowrap = cell.style.whiteSpace === 'nowrap';
        cell.style.whiteSpace = isNowrap ? 'normal' : 'nowrap';
    } else if (action === 'insertRowAbove') {
        const newRow = document.createElement('tr');
        Array.from(row.cells).forEach(c => {
            const newCell = document.createElement('td');
            newCell.style.border = c.style.border || '1px solid #ccc';
            newCell.style.padding = c.style.padding || '8px';
            newCell.innerHTML = '&nbsp;';
            newRow.appendChild(newCell);
        });
        row.parentNode.insertBefore(newRow, row);
    } else if (action === 'insertRowBelow') {
        const newRow = document.createElement('tr');
        Array.from(row.cells).forEach(c => {
            const newCell = document.createElement('td');
            newCell.style.border = c.style.border || '1px solid #ccc';
            newCell.style.padding = c.style.padding || '8px';
            newCell.innerHTML = '&nbsp;';
            newRow.appendChild(newCell);
        });
        row.parentNode.insertBefore(newRow, row.nextSibling);
    } else if (action === 'insertColLeft') {
        const cellIndex = cell.cellIndex;
        Array.from(table.rows).forEach(r => {
            const newCell = document.createElement(r.cells[cellIndex].tagName);
            newCell.style.border = r.cells[cellIndex].style.border || '1px solid #ccc';
            newCell.style.padding = r.cells[cellIndex].style.padding || '8px';
            newCell.innerHTML = '&nbsp;';
            r.insertBefore(newCell, r.cells[cellIndex]);
        });
    } else if (action === 'insertColRight') {
        const cellIndex = cell.cellIndex;
        const insertIndex = cellIndex + 1;
        Array.from(table.rows).forEach(r => {
            const newCell = document.createElement(r.cells[cellIndex].tagName);
            newCell.style.border = r.cells[cellIndex].style.border || '1px solid #ccc';
            newCell.style.padding = r.cells[cellIndex].style.padding || '8px';
            newCell.innerHTML = '&nbsp;';
            if (insertIndex >= r.cells.length) {
                r.appendChild(newCell);
            } else {
                r.insertBefore(newCell, r.cells[insertIndex]);
            }
        });
    } else if (action === 'deleteRow') {
        row.remove();
    } else if (action === 'deleteCol') {
        const cellIndex = cell.cellIndex;
        Array.from(table.rows).forEach(r => {
            if (r.cells[cellIndex]) r.cells[cellIndex].remove();
        });
    } else if (action === 'alignLeft') {
        cell.style.textAlign = 'left';
    } else if (action === 'alignCenter') {
        cell.style.textAlign = 'center';
    } else if (action === 'alignRight') {
        cell.style.textAlign = 'right';
    } else if (action === 'shadeGray') {
        cell.style.backgroundColor = '#f1f5f9';
    } else if (action === 'shadeLightBlue') {
        cell.style.backgroundColor = '#e0f2fe';
    } else if (action === 'shadeLightGreen') {
        cell.style.backgroundColor = '#dcfce7';
    } else if (action === 'shadeNone') {
        cell.style.backgroundColor = '';
    }
    
    selectEl.value = "";
};

document.addEventListener('selectionchange', () => {
    const selectEl = document.getElementById('table-actions-select');
    if (!selectEl) return;
    
    const activeBlock = getActiveBlock();
    if (!activeBlock) {
        selectEl.style.display = 'none';
        return;
    }
    
    const sel = window.getSelection();
    if (!sel.rangeCount) {
        selectEl.style.display = 'none';
        return;
    }
    
    let node = sel.getRangeAt(0).startContainer;
    let insideTable = false;
    while (node && node !== activeBlock) {
        if (node.nodeName === 'TABLE') {
            insideTable = true;
            break;
        }
        node = node.parentNode;
    }
    
    selectEl.style.display = insideTable ? 'inline-block' : 'none';
});
