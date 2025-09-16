import { fetchDues, fetchHomeownerName, createDue, deleteDueData, getLastReceiptNo, markAsArchive, fetchArchivedDues, restoreDueData, addNotes, fetchHomeownerID, fetchDueData, partialPaymentData, balance_data, userfetchDuesByUserId } from '../api/api-dues.js';
import { SoundManager } from '../utils/soundManager.js';
import { logDueHistory } from '../utils/historyLogs.js';
import { generateNotification } from '../api/api-notification.js'
import { colorConfig } from '../utils/colorStatus.js';
import { logoutUser } from '../api/auth-guard.js';

const due = (() => {
  const userProfile = JSON.parse(localStorage.getItem('user'));

  const base = () => {
    let allDues = [];
    let currentReceipt = null;
    let currentDueId = null;
    const createForm = document.getElementById('createDueForm');
    const partialForm = document.getElementById('partialPaymentForm');
    

    const debounce = (func, delay) => {
      let timeoutId;
      return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
      };
    };

    const loadDues = async () => {
      try {
        const activeData = await fetchDues();
        const archivedData = await fetchArchivedDues();
        
        allDues = [
          ...new Map(
            [...activeData.map(d => ({ ...d, isArchived: false })), ...archivedData.map(d => ({ ...d, isArchived: true }))]
            .map(item => [item.id, item])
          ).values()
        ].filter(d => d.id && d.due_date && d.status && d.type && typeof d.paid_amount !== 'undefined');
        
        return allDues;
      } catch (error) {
        console.error('Error loading dues:', error);
        alert('Failed to load dues. Please check your connection and try again.');
        allDues = [];
        return [];
      }
    };

    const loadUserDues = async () => {
      try {
        const userId = userProfile?.id;
        const data = await userfetchDuesByUserId(userId);
        return data.filter(d => d.id && d.due_date && d.status && d.type && typeof d.paid_amount !== 'undefined');
      } catch (error) {
        console.error('Error loading user dues:', error);
        alert('Failed to load your dues. Please check your connection and try again.');
        return [];
      }
    };

    const filterDues = (searchTerm = '', canManage) => {
      const status = document.getElementById('due_statusFilter')?.value || 'all';
      const type = document.getElementById('due_categoryFilter')?.value || 'all';
      const archivedValue = document.getElementById('due_archivedFilter')?.value || 'active';

      const filteredData = allDues.filter(d => {
        const searchMatch = searchTerm === '' || 
          d.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          d.type?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const statusMatch = status === 'all' || d.status === status;
        const typeMatch = type === 'all' || d.type === type;
        
        const archivedMatch = 
          archivedValue === 'active' ? !d.isArchived :
          archivedValue === 'archived' ? d.isArchived : true;
        
        return searchMatch && statusMatch && typeMatch && archivedMatch;
      });

      renderTable(filteredData, canManage);
      renderCard(filteredData, canManage);
      return filteredData;
    };

    const filterUserDues = (data, searchTerm = '') => {
      const status = document.getElementById('due_statusFilter')?.value || 'all';
      const type = document.getElementById('due_categoryFilter')?.value || 'all';

      const filteredData = data.filter(d => {
        const searchMatch = searchTerm === '' || 
          d.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          d.type?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const statusMatch = status === 'all' || d.status === status;
        const typeMatch = type === 'all' || d.type === type;
        
        return searchMatch && statusMatch && typeMatch;
      });

      renderTableMember(filteredData);
      renderCardMember(filteredData);
      return filteredData;
    };

    const renderTable = (data, canManage) => {
      const tbody = document.getElementById('dueTable');
      if (!tbody) {
        console.warn('dueTable element not found');
        return;
      }

      const renderedIds = new Set();
      data = data
        .filter(d => !d.isArchived || canManage)
        .filter(d => {
          if (renderedIds.has(d.id)) return false;
          renderedIds.add(d.id);
          return true;
        });

      tbody.innerHTML = data.length ? data.map(d => {
        const status = d.status === 'Archived' ? 'Archived' : (d.status || 'Pending Verification');
        const statusColor = d.status === 'Archived' ? '#6c757d' : getStatusColor(status);
        
        return `
          <tr data-id="${d.id}">
            <td>${d.receipt_no || 'N/A'}</td>
            <td>${d.full_name || 'N/A'}</td>
            <td data-type="${d.type}" style="color: ${getTypeColor(d.type)}"><strong>${d.type || 'N/A'}</strong></td>
            <td>₱${d.amount || 'N/A'}</td>
            <td>₱${d.paid_amount || 'N/A'}</td>
            <td>${d.due_date || 'N/A'}</td>
            <td><button style="font-weight:bold; padding: 5px 5px; border: none; background-color:${statusColor}; color: white; border-radius: 0px; cursor: pointer;">${status}</button></td>
            <td>${d.payment_method || 'N/A'}</td>
            <td>${d.notes || 'N/A'}</td>
            <td>
              ${status === 'Complete' || status === 'Archived' ? '' : `
                <button class="mark-paid-btn" data-id="${d.id}"> <i class="fas fa-money-bill-wave"></i> Pay Due</button>
              `}
              <button class="add-note-btn" data-id="${d.id}"><i class="fas fa-sticky-note"></i> Add Notes</button>
              ${canManage ? `
                ${status === 'Archived' ? `
                  <button class="restore-btn" data-id="${d.id}"><i class="fas fa-undo"></i> Restore</button>
                ` : `
                  <button class="mark-archive-btn" data-id="${d.id}"><i class="fas fa-archive"></i> Archive</button>
                `}
                <button class="mark-delete-btn due-delete-btn" data-id="${d.id}"><i class="fas fa-trash-alt"></i> Delete</button>
              ` : ''}
            </td>
          </tr>
        `;
      }).join('') : `
         <tr>
            <td class="center-cell" colspan="10">
              <div class="no-data">
                <i class="fa fa-box-open" style="font-size:5rem; color: #888;"></i>
                <p>No dues found</p>
              </div>
            </td>
          </tr>
      `;
    };

    const renderCard = (data, canManage) => {
      const container = document.getElementById('dueCardView');
      if (!container) {
        console.warn('dueCardView element not found');
        return;
      }

      const renderedIds = new Set();
      data = data
        .filter(d => !d.isArchived || canManage)
        .filter(d => {
          if (renderedIds.has(d.id)) return false;
          renderedIds.add(d.id);
          return true;
        });

      container.innerHTML = data.length ? data.map(d => {
        const status = d.status || 'Pending Verification';
        const statusColor = getStatusColor(status);
        
        return `
          <div class="due-card" data-id="${d.id}">
            <h4>${d.full_name || 'N/A'}</h4>
            <p><strong>Type:</strong> <span data-type="${d.type}" style="color: ${getTypeColor(d.type)}"><strong>${d.type || 'N/A'}</strong></span></p>
            <p><strong>Amount:</strong> ₱${d.amount || '0'}</p>
            <p><strong>Status:</strong><button style="font-weight:bold; padding: 5px 5px; border: none; background-color:${statusColor}; color: white; border-radius: 0px; cursor: pointer; margin-left:5px;"> ${status}</button></p>
            <p><strong>Paid:</strong> ₱${d.paid_amount || '0'}</p>
            <p><strong>Due Date:</strong> ${d.due_date || 'N/A'}</p>
            <p><strong>Payment Method:</strong> ${d.payment_method || 'N/A'}</p>
            <p><strong>Receipt No:</strong> ${d.receipt_no || 'N/A'}</p>
            <div class="card-actions">
              ${status === 'Complete' ? '' : `
                <button class="mark-paid-btn" data-id="${d.id}"> <i class="fas fa-money-bill-wave"></i> Pay Due</button>
              `}
              <button class="add-note-btn" data-id="${d.id}"><i class="fas fa-sticky-note"></i> Add Notes</button>
              ${canManage ? `
                ${status === 'Archived' ? `
                  <button class="restore-btn" data-id="${d.id}"><i class="fas fa-undo"></i> Restore</button>
                ` : `
                  <button class="mark-archive-btn" data-id="${d.id}"><i class="fas fa-archive"></i> Archive</button>
                `}
                <button class="mark-delete-btn due-delete-btn" data-id="${d.id}"><i class="fas fa-trash-alt"></i> Delete</button>
              ` : ''}
            </div>
          </div>
        `;
      }).join('') : `
        <div style="
          position: absolute;
          top: 50%;
          left: 55%;
          transform: translate(-50%, -50%);
          width: 100%;
          text-align: center;
          color: #888;
        ">
          <i class='fa fa-box-open' style='font-size: 70px;'></i>
          <p style='margin-top: 2.5rem;'>No dues found</p>
        </div>
      `;
    };

    const renderTableMember = (data) => {
      const tbody = document.getElementById('dueTable');
      if (!tbody) {
        console.warn('dueTable element not found');
        return;
      }

      const renderedIds = new Set();
      data = data.filter(d => {
        if (renderedIds.has(d.id)) return false;
        renderedIds.add(d.id);
        return true;
      });

      tbody.innerHTML = data.length ? data.map(d => {
        const status = d.status || 'Pending Verification';
        const statusColor = getStatusColor(status);
        
        return `
          <tr data-id="${d.id}">
            <td>${d.receipt_no || 'N/A'}</td>
            <td>${d.full_name || 'N/A'}</td>
            <td data-type="${d.type}" style="color: ${getTypeColor(d.type)}"><strong>${d.type || 'N/A'}</strong></td>
            <td>₱${d.amount || 'N/A'}</td>
            <td>₱${d.paid_amount || 'N/A'}</td>
            <td>${d.due_date || 'N/A'}</td>
            <td><button style="font-weight:bold; padding: 5px 5px; border: none; background-color:${statusColor}; color: white; border-radius: 0px; cursor: pointer;">${status}</button></td>
            <td>${d.payment_method || 'N/A'}</td>
            <td>${d.notes || 'N/A'}</td>
            <td>
              ${status === 'Complete' ? '' : `
                <button class="mark-paid-btn" data-id="${d.id}"> <i class="fas fa-money-bill-wave"></i> Pay Due</button>
              `}
            </td>
          </tr>
        `;
      }).join('') : `
        <div style="position: absolute; top: 50%; left: 55%; transform: translate(-50%, -50%); width: 100%; text-align: center; color: #888;">
          <i class='fa fa-box-open' style='font-size: 70px;'></i>
          <p style='margin-top: 2.5rem;'>No dues found</p>
        </div>
      `;
    };

    const renderCardMember = (data) => {
      const container = document.getElementById('dueCardView');
      if (!container) {
        console.warn('dueCardView element not found');
        return;
      }

      const renderedIds = new Set();
      data = data.filter(d => {
        if (renderedIds.has(d.id)) return false;
        renderedIds.add(d.id);
        return true;
      });

      container.innerHTML = data.length ? data.map(d => {
        const status = d.status || 'Pending Verification';
        const statusColor = getStatusColor(status);
        
        return `
          <div class="due-card" data-id="${d.id}">
            <h4>${d.full_name || 'N/A'}</h4>
            <p><strong>Type:</strong> <span data-type="${d.type}" style="color: ${getTypeColor(d.type)}"><strong>${d.type || 'N/A'}</strong></span></p>
            <p><strong>Amount:</strong> ₱${d.amount || '0'}</p>
            <p><strong>Status:</strong><button style="font-weight:bold; padding: 5px 5px; border: none; background-color:${statusColor}; color: white; border-radius: 0px; cursor: pointer; margin-left:5px;"> ${status}</button></p>
            <p><strong>Paid:</strong> ₱${d.paid_amount || '0'}</p>
            <p><strong>Due Date:</strong> ${d.due_date || 'N/A'}</p>
            <p><strong>Payment Method:</strong> ${d.payment_method || 'N/A'}</p>
            <p><strong>Receipt No:</strong> ${d.receipt_no || 'N/A'}</p>
            <div class="card-actions">
              ${status === 'Complete' ? '' : `
                <button class="mark-paid-btn" data-id="${d.id}"> <i class="fas fa-money-bill-wave"></i> Pay Due</button>
              `}
            </div>
          </div>
        `;
      }).join('') : `
        <div style="
          position: absolute;
          top: 50%;
          left: 55%;
          transform: translate(-50%, -50%);
          width: 100%;
          text-align: center;
          color: #888;
        ">
          <i class='fa fa-box-open' style='font-size: 70px;'></i>
          <p style='margin-top: 2.5rem;'>No dues found</p>
        </div>
      `;
    };

    const receiptProcess = async (rawDueData) => {
      console.log('Processing receipt with data:', rawDueData);
      const subtotal = parseFloat(rawDueData.amount) || 0;
      const lateFee = parseFloat(rawDueData.late_fee) || 0;
      const totalDue = subtotal + lateFee;
      const paidAmount = parseFloat(rawDueData.paid_amount) || 0;
      const balanceDue = parseFloat(rawDueData.balance_due) || 0;
      const isFullyPaid = balanceDue <= 0;
      const change = isFullyPaid ? Math.max(0, paidAmount - totalDue) : 0;
      
      const homeowner = await fetchHomeownerName(rawDueData.homeowner_id);
      
      currentReceipt = {
        id: rawDueData.id,
        receiptNo: rawDueData.receipt_no,
        homeownerName: homeowner || 'Unknown',
        description: rawDueData.description || 'N/A',
        subtotal: subtotal,
        lateFee: lateFee,
        totalDue: totalDue,
        status: rawDueData.status,
        paidAmount: paidAmount,
        change: change,
        balanceDue: balanceDue,
        isFullyPaid: isFullyPaid,
        paymentMethod: rawDueData.payment_method || 'Cash',
        paymentDate: rawDueData.payment_date || new Date().toISOString() || null,
        notes: rawDueData.notes || 'None'
      };

      console.log('Generated currentReceipt:', currentReceipt);
      displayReceipt(currentReceipt);
    };

    const displayReceipt = (receipt, isPartial = false) => {
      if (!receipt || !receipt.id) {
        console.error('Invalid receipt data');
        alert('Failed to display receipt: Invalid data');
        return;
      }

      const prefix = isPartial ? 'partial-' : '';
      const containerId = isPartial ? 'partialReceiptContainer' : 'receiptContainer';
      const emptyStateId = isPartial ? 'partialEmptyState' : 'emptyState';
      
      const container = document.getElementById(containerId);
      const emptyState = document.getElementById(emptyStateId);
      
      if (!container || !emptyState) {
        console.error(`Missing container (${containerId}) or empty state (${emptyStateId})`);
        alert(`Failed to display receipt: Missing ${containerId} or ${emptyStateId}`);
        return;
      }
      
      document.getElementById('receiptContainer')?.classList.add('hidden');
      document.getElementById('partialReceiptContainer')?.classList.add('hidden');
      document.getElementById('emptyState')?.classList.remove('hidden');
      document.getElementById('partialEmptyState')?.classList.remove('hidden');
      
      container.classList.remove('hidden');
      emptyState.classList.add('hidden');
      
      const format = amount => `₱${(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

      const setText = (id, value) => {
        const el = document.getElementById(`${prefix}${id}`);
        if (el) el.textContent = value;
        else console.warn(`Element ${prefix}${id} not found`);
      };

      setText('displayReceiptNo', receipt.receiptNo || 'N/A');
      setText('displayDate', receipt.paymentDate ? new Date(receipt.paymentDate).toLocaleDateString() : 'N/A');
      setText('displayHomeowner', receipt.homeownerName || 'N/A');
      setText('displayDescription', receipt.description || 'N/A');
      setText('displaySubtotal', format(receipt.subtotal));
      setText('displayLateFee', format(receipt.lateFee));
      setText('displayTotalDue', format(receipt.totalDue));
      setText('displayStatus', receipt.status || 'Error');
      setText('displayPaidAmount', format(receipt.paidAmount));
      setText('displayBalance', format(receipt.balanceDue));
      setText('displayChange', format(receipt.change));
      setText('displayMethod', receipt.paymentMethod || 'N/A');
      setText('displayNotes', receipt.notes || 'N/A');

      SoundManager.playReceipt();
    };

    const generateNextReceiptNo = async () => {
      try {
        const currentYear = new Date().getFullYear();
        const lastNo = await getLastReceiptNo();
        let lastSeq = 0;
        let yearPrefix = currentYear;

        if (lastNo) {
          const parts = lastNo.split('-');
          if (parts.length === 2) {
            const [prefix, seq] = parts;
            yearPrefix = prefix.slice(1);
            lastSeq = parseInt(seq) || 0;
          }
        }

        if (yearPrefix !== currentYear.toString()) lastSeq = 0;
        return `R${currentYear}-${(lastSeq + 1).toString().padStart(3, '0')}`;
      } catch (error) {
        console.error('Error generating receipt number:', error);
        return `R${new Date().getFullYear()}-001`;
      }
    };

    const saveNewDue = async () => {
      try {
        const homeownerId = document.getElementById('due-homeownerId').value.trim();
        const dueType = document.getElementById('dueType').value;
        const dueDescription = document.getElementById('dueDescription').value.trim();
        const dueAmount = parseFloat(document.getElementById('dueAmount').value.trim()) || 0;
        const inputPaidAmount = parseFloat(document.getElementById('duePaidAmount').value.trim()) || 0;
        const dueDate = document.getElementById('dueDate').value;
        const dueLateFee = parseFloat(document.getElementById('dueLateFee').value) || 0;
        const duePaymentDate = document.getElementById('duePaymentDate').value;
        const duePaymentMethod = document.getElementById('paymentMethod').value;
        const dueBillingPeriod = document.getElementById('dueBillingPeriod').value;
        const dueNote = document.getElementById('dueNote').value.trim();
        const newReceiptNo = await generateNextReceiptNo();

        if (!homeownerId || !dueType || isNaN(dueAmount) || !dueDate) {
          throw new Error("Missing or invalid required fields");
        }

        const totalOwed = dueAmount + dueLateFee;
        const storedPaidAmount = Math.min(inputPaidAmount, totalOwed);
        const balance_due = Math.max(0, totalOwed - storedPaidAmount);
        const homeownerName = await fetchHomeownerName(homeownerId);
        let status;
        if (storedPaidAmount <= 0) {
          status = 'Overdue';
          generateNotification("Due Payment is Overdue", `${homeownerName} has paid ${storedPaidAmount} for due`, "dues", String(homeownerId));

        } else if (storedPaidAmount >= totalOwed) {
          status = 'Complete';
          generateNotification("Due Payment is Completed", `${homeownerName} has paid ${storedPaidAmount} for due`, "dues", String(homeownerId));
        } else {
          status = 'On going';
          generateNotification("Partial Payment is On Going", `${homeownerName} has paid ${storedPaidAmount} for due`, "dues", String(homeownerId));
        }

        const dueData = {
          receipt_no: newReceiptNo,
          homeowner_id: homeownerId,
          type: dueType,
          description: dueDescription,
          amount: dueAmount,
          paid_amount: storedPaidAmount,
          due_date: dueDate,
          late_fee: dueLateFee,
          status: status,
          payment_date: duePaymentDate || null,
          payment_method: duePaymentMethod,
          billing_period: dueBillingPeriod || null,
          notes: dueNote || null,
          created_at: new Date().toISOString(),
          balance_due: balance_due
        };

        const createdDue = await createDue(dueData);
        const dueId = createdDue.id;

        await logDueHistory(
          dueId,
          homeownerId,
          userProfile?.role === 'member' ? null : userProfile?.id,
          'Due Created',
          null,
          dueData,
          `New due created for ${dueType} with amount ₱${dueAmount}`
        );
        await balance_data(dueId, balance_due);

        currentReceipt = null;
        await receiptProcess({ ...dueData, id: dueId });

        const receiptContainer = document.getElementById('receiptContainer');
        if (!receiptContainer) {
          console.error('Receipt container not found');
          alert('Failed to display receipt: Receipt container missing.');
        }
        if (userProfile?.role === 'member') {
          const userDues = await loadUserDues();
          console.log('Reloaded user dues after partial payment:', userDues);
          filterUserDues(userDues, '');
        } else {
          const dues = await loadDues();
          filterDues('', true);
        }
        SoundManager.playConfirmation();
        if (createForm) createForm.reset();
      } catch (error) {
        console.error("Error adding due:", error.message);
        alert(`Error: ${error.message}`);
        SoundManager.playError();
      }
    };

    const openPaymentForm = async (dueId) => {
      const modal = document.getElementById('duePaymentModal');
      if (!modal) {
        console.warn('duePaymentModal not found');
        return;
      }
      modal.classList.add('active');
      document.getElementById('editId').value = dueId;
      
      try {
        const dueData = await fetchDueData(dueId);
        console.log('Fetched due data for payment form:', dueData);
        const partialDueID = await fetchHomeownerID(dueId);
        const homeownerUuid = partialDueID?.homeowner_id?.id ?? partialDueID?.homeowner_id;
        const homeownerName = await fetchHomeownerName(homeownerUuid);

        document.getElementById('partialHomeownerName').textContent = homeownerName || 'Unknown';
        document.getElementById('partialHomeownerAmount').textContent = `₱${dueData.balance_due || '0'}`;
        document.getElementById('partialHomeownerStatus').textContent = dueData.status || 'Unknown';
        document.getElementById('partialHomeownerType').textContent = dueData.type || 'Unknown';
        document.getElementById('partialHomeownerDescription').textContent = dueData.description || 'N/A';
        document.getElementById('partialHomeownerNote').textContent = dueData.notes || 'N/A';
      } catch (error) {
        console.error('Error loading payment form data:', error);
        alert('Failed to load payment form data.');
      }
    };

    const partialPayment = async () => {
      if (!partialForm) {
        console.error('partialPaymentForm not found');
        throw new Error('Payment form not found');
      }
      if (partialForm.dataset.submitting === 'true') {
        console.log('Ignoring duplicate partial payment submission');
        return;
      }
      partialForm.dataset.submitting = 'true';
      console.log('Starting partial payment processing (ID: ' + Date.now() + ')');
      try {
        const dueId = document.getElementById('editId').value;
        if (!dueId) throw new Error('Missing due ID');

        const dueData = await fetchDueData(dueId);
        if (!dueData || isNaN(dueData.amount) || parseFloat(dueData.amount) <= 0) {
          throw new Error('Invalid or missing due amount');
        }

        const partialDueID = await fetchHomeownerID(dueId);
        const homeownerUuid = partialDueID?.homeowner_id?.id ?? partialDueID?.homeowner_id;
        const homeownerName = await fetchHomeownerName(homeownerUuid);

        const paymentMethod = document.getElementById('partialPaymentMethod').value;
        const note = document.getElementById('partialNote').value;
        const lateFee = parseFloat(document.getElementById('partialLateFee').value) || 0;
        const partialPaidAmount = parseFloat(document.getElementById('partialPaidAmount').value) || 0;
        const partialPaymentDate = document.getElementById('partialPaymentDate').value || new Date().toISOString();

        if (isNaN(partialPaidAmount) || partialPaidAmount <= 0) {
          throw new Error('Invalid partial payment amount');
        }

        const toCents = (amount) => Math.round(parseFloat(amount || 0) * 100);

        const existingPaidCents = toCents(dueData.paid_amount);
        const subtotalCents = toCents(dueData.amount);
        const lateFeeCents = toCents(lateFee);
        const partialPaidCents = toCents(partialPaidAmount);

        const totalDueCents = subtotalCents + lateFeeCents;
        const totalPaidSoFarCents = existingPaidCents + partialPaidCents;

        const balanceDueCents = Math.max(0, totalDueCents - totalPaidSoFarCents);
        const changeCents = Math.max(0, totalPaidSoFarCents - totalDueCents);

        const isFullyPaid = totalPaidSoFarCents >= totalDueCents;

        const updatedPaidAmount = Math.min(totalPaidSoFarCents, totalDueCents) / 100;
        const totalDue = totalDueCents / 100;
        const balanceDue = balanceDueCents / 100;
        const change = changeCents / 100;
        const totalLateFee = lateFeeCents / 100;

        let status;
        if (isFullyPaid) {
          status = 'Complete';
          generateNotification("Due Payment is Completed", `${homeownerName} has paid ${updatedPaidAmount} for due`, "dues", String(homeownerUuid));
        } else if (totalPaidSoFarCents > 0) {
          status = 'On going';
          generateNotification("Partial Payment is On Going", `${homeownerName} has paid ${updatedPaidAmount} for due`, "dues", String(homeownerUuid));
        } else {
          status = 'Overdue';
          generateNotification("Due Payment is Overdue", `${homeownerName} has paid ${updatedPaidAmount} for due`, "dues", String(homeownerUuid));
        }

        const newReceiptNo = await generateNextReceiptNo();

        const partialReceipt = {
          id: dueId,
          receiptNo: newReceiptNo,
          homeownerName: homeownerName || 'Unknown',
          description: dueData.description || 'N/A',
          subtotal: subtotalCents / 100,
          lateFee: totalLateFee,
          totalDue: totalDue,
          status: status,
          paymentMethod: paymentMethod || 'Cash',
          paidAmount: updatedPaidAmount,
          balanceDue: balanceDue,
          change: change,
          isFullyPaid: isFullyPaid,
          paymentDate: partialPaymentDate,
          notes: note || 'None'
        };

        await partialPaymentData(dueId, updatedPaidAmount, status, balanceDue, paymentMethod, partialPaymentDate, note);
        await balance_data(dueId, balanceDue);

        await logDueHistory(
          dueId,
          homeownerUuid,
          userProfile?.role === 'member' ? null : userProfile?.id,
          'Partial Payment',
          dueData,
          { ...dueData, paid_amount: updatedPaidAmount, status, balance_due: balanceDue, payment_method: paymentMethod, payment_date: partialPaymentDate, notes: note },
          `Partial payment of ₱${partialPaidAmount.toFixed(2)} made on ${partialPaymentDate}`
        );

        displayReceipt(partialReceipt, true);

        const searchInput = document.getElementById('searchDue');
        const statusFilter = document.getElementById('due_statusFilter');
        const categoryFilter = document.getElementById('due_categoryFilter');

        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = 'all';
        if (categoryFilter) categoryFilter.value = 'all';

        if (userProfile?.role === 'member') {
          const userDues = await loadUserDues();
          console.log('Reloaded user dues after partial payment:', userDues);
          filterUserDues(userDues, '');
        } else {
          const dues = await loadDues();
          filterDues('', true);
        }
        
        

        SoundManager.playConfirmation();
      } catch (error) {
        console.error('Partial payment failed:', error);
        alert(`Payment failed: ${error.message}`);
        SoundManager.playError();
      } finally {
        setTimeout(() => {
          partialForm.dataset.submitting = 'false';
          console.log('Reset submitting flag: (ID: ' + Date.now() + ')');
        }, 1000); 
      }
    };

    const getStatusColor = (status) => colorConfig.status[status] || colorConfig.status._default;
    const getTypeColor = (type) => colorConfig.types[type] || colorConfig.types._default;

    const saveNote = async () => {
      const modal = document.getElementById('dueNoteModal');
      const dueId = currentDueId || modal?.dataset.dueId;

      if (!dueId) {
        alert('Missing due ID. Please close and reopen the modal.');
        closeNote();
        return;
      }

      const note = document.getElementById('AddNote')?.value.trim();

      try {
        await addNotes(dueId, note);


        const partialDueID = await fetchHomeownerID(dueId);
        const homeownerUuid = partialDueID?.homeowner_id?.id ?? partialDueID?.homeowner_id;

        await logDueHistory(
          dueId,
          homeownerUuid,                               
          userProfile?.role === 'member' ? null : userProfile?.id, 
          'Note Added',                                 
          null,                                        
          { notes: note },                          
          `Note added: ${note}`                        
        );

        if (userProfile?.role === 'member') {
          const userDues = await loadUserDues();
          console.log('Reloaded user dues after partial payment:', userDues);
          filterUserDues(userDues, '');
        } else {
          const dues = await loadDues();
          filterDues('', true);
        }

        SoundManager.playNote();
      } catch (error) {
        console.error('Error saving note:', error);
        alert('Failed to add note: ' + error.message);
        SoundManager.playError();
      } finally {
        try {
          closeNote();
        } catch (closeError) {
          console.warn('Failed to close note modal:', closeError);
        }
        loadDues();
      }
    };

    const openNote = async (dueId) => {
      const modal = document.getElementById('dueNoteModal');
      if (!modal) {
        console.warn('dueNoteModal not found');
        return;
      }
      modal.classList.add('active');

      currentDueId = dueId;
      modal.dataset.dueId = dueId;

      try {
        const dueData = await fetchDueData(dueId);
        let homeownerUuid = dueData.homeowner_id?.id ?? dueData.homeowner_id;
        if (!homeownerUuid) {
          const partialDueID = await fetchHomeownerID(dueId);
          homeownerUuid = partialDueID?.homeowner_id?.id ?? partialDueID?.homeowner_id;
        }
        const homeownerName = await fetchHomeownerName(homeownerUuid) || dueData.full_name || 'Unknown';
        document.getElementById('dueNoteHomeownerName').textContent = homeownerName;
        document.getElementById('AddNote').value = dueData.notes || '';
      } catch (error) {
        console.error('Error loading note modal data:', error);
        document.getElementById('dueNoteHomeownerName').textContent = 'Unknown';
        alert('Failed to load note details.');
      }
    };

    const closeNote = () => {
      const modal = document.getElementById('dueNoteModal');
      if (modal) modal.classList.remove('active');
    };

    const closePaymentForm = () => {
      const modal = document.getElementById('duePaymentModal');
      if (modal) modal.classList.remove('active');
    };

    return {
      allDues,
      currentReceipt,
      currentDueId,
      createForm,
      partialForm,
      colorConfig,
      debounce,
      loadDues,
      loadUserDues,
      filterDues,
      filterUserDues,
      renderTable,
      renderCard,
      renderTableMember,
      renderCardMember,
      receiptProcess,
      displayReceipt,
      generateNextReceiptNo,
      saveNewDue,
      openPaymentForm,
      partialPayment,
      getStatusColor,
      getTypeColor,
      saveNote,
      openNote,
      closeNote,
      closePaymentForm
    };
  };

  const staff = () => {
    const baseModule = base();

    const init = () => {
      const domLoaded = () => {
        setupEventListeners();
        baseModule.loadDues().then(data => {
          filterDues('', true);
          renderCharts(data);
        });
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', domLoaded);
      } else {
        domLoaded();
      }

      if (baseModule.createForm) {
        const newForm = baseModule.createForm.cloneNode(true);
        baseModule.createForm.parentNode.replaceChild(newForm, baseModule.createForm);
        baseModule.createForm = newForm;
        baseModule.createForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (baseModule.createForm.dataset.submitting === 'true') {
            console.log('Ignoring duplicate create due submission');
            return;
          }
          console.log('Create form submitted (staff)');
          baseModule.createForm.dataset.submitting = 'true';
          try {
            await baseModule.saveNewDue();
          } finally {
            setTimeout(() => {
              baseModule.createForm.dataset.submitting = 'false';
            }, 1000);
          }
        }, { once: false });
      } else {
        console.warn('createDueForm not found');
      }

      if (baseModule.partialForm) {
        const newForm = baseModule.partialForm.cloneNode(true);
        baseModule.partialForm.parentNode.replaceChild(newForm, baseModule.partialForm);
        baseModule.partialForm = newForm;
        baseModule.partialForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (baseModule.partialForm.dataset.submitting === 'true') {
            console.log('Ignoring duplicate partial payment submission');
            return;
          }
          console.log('Partial form submitted (staff)');
          baseModule.partialForm.dataset.submitting = 'true';
          try {
            await baseModule.partialPayment();
          } finally {
            setTimeout(() => {
              baseModule.partialForm.dataset.submitting = 'false';
            }, 1000);
          }
        }, { once: false });
      } else {
        console.warn('partialPaymentForm not found');
      }
    };

    const setupEventListeners = () => {
      const searchInput = document.getElementById('searchDue');
      const statusFilter = document.getElementById('due_statusFilter');
      const categoryFilter = document.getElementById('due_categoryFilter');
      const archivedFilter = document.getElementById('due_archivedFilter');
      const printBtn = document.getElementById('printReceiptBtn');
      const deleteBtn = document.getElementById('deleteReceiptBtn');

      if (searchInput) {
        searchInput.addEventListener('input', baseModule.debounce((e) => filterDues(e.target.value.trim(), true), 300));
      } else {
        console.warn('searchDue element not found');
      }

      [statusFilter, categoryFilter, archivedFilter].forEach(filter => {
        if (filter) {
          filter.addEventListener('change', () => {
            const searchTerm = document.getElementById('searchDue')?.value.trim() || '';
            filterDues(searchTerm, true);
          });
        } else {
          console.warn(`Filter element not found: ${filter ? 'categoryFilter/archivedFilter' : 'statusFilter'}`);
        }
      });

      if (printBtn) {
        printBtn.addEventListener('click', printReceipt);
      } else {
        console.warn('printReceiptBtn element not found');
      }

      if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteReceipt);
      } else {
        console.warn('deleteReceiptBtn element not found');
      }

      document.getElementById('archiveBtn')?.addEventListener('click', () => {
        if (baseModule.currentReceipt?.id) {
          markArchive(baseModule.currentReceipt.id);
        } else {
          alert('No due selected or ID missing.');
        }
      });

      document.getElementById('deleteBtn')?.addEventListener('click', () => {
        if (baseModule.currentReceipt?.id) {
          deleteDue(baseModule.currentReceipt.id);
        } else {
          alert('No due selected or ID missing.');
        }
      });

      document.getElementById('partialArchiveBtn')?.addEventListener('click', () => {
        if (baseModule.currentReceipt?.id) {
          markArchive(baseModule.currentReceipt.id);
        } else {
          alert('No due selected or ID missing.');
        }
      });

      document.getElementById('partialDeleteBtn')?.addEventListener('click', () => {
        if (baseModule.currentReceipt?.id) {
          deleteDue(baseModule.currentReceipt.id);
        } else {
          alert('No due selected or ID missing.');
        }
      });
    };

    const filterDues = (searchTerm, canManage) => {
      const filteredData = baseModule.filterDues(searchTerm, canManage);
      attachTableListeners();
      attachCardListeners();
      return filteredData;
    };

    const renderCharts = (data) => {
      if (!Array.isArray(data) || data.length === 0) {
        console.warn('No valid data for charts, skipping rendering');
        return;
      }

      try {
        renderStatusChart(data);
        renderTypeChart(data);
        renderDuesChart(data);
      } catch (error) {
        console.error('Chart rendering error:', error);
        alert('Failed to render charts. Please try again.');
      }
    };

    const renderStatusChart = (data) => {
      const containerId = 'pieChart_status';
      const container = document.getElementById(containerId);
      if (!container) {
        console.warn('pieChart_status container not found');
        return;
      }
      container.innerHTML = '';

      const statusColors = {
        ...baseModule.colorConfig.status,
        'Archived': '#6c757d'
      };

      const statusCounts = data.reduce((acc, d) => {
        const status = d.isArchived ? 'Archived' : (d.status || 'Pending Verification');
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      if (Object.keys(statusCounts).length === 0) {
        console.warn('No status data for pie chart, skipping');
        container.innerHTML = '<p>No data available for status chart</p>';
        return;
      }

      const chartData = Object.entries(statusCounts).map(([status, count]) => ({
        x: status,
        value: count,
        fill: statusColors[status] || statusColors['_default']
      }));

      const chart = anychart.pie(chartData);
      chart.innerRadius('65%');

      const label = anychart.standalones.label();
      label.useHtml(true)
        .text('<span style="color:#313136;font-size:18px;font-weight:bold;">Payment Status</span>')
        .position('center').anchor('center').hAlign('center').vAlign('middle');

      chart.center().content(label);
      chart.container(containerId).draw();
    };

    const renderDuesChart = (data) => {
      const containerId = 'columnBarChart_total';
      const container = document.getElementById(containerId);
      if (!container) {
        console.warn('columnBarChart_total container not found');
        return;
      }
      container.innerHTML = '';

      const yearlySummary = data.reduce((acc, due) => {
        if (!due.due_date || typeof due.paid_amount === 'undefined') return acc;

        const year = due.due_date.slice(0, 4);
        const type = due.type || 'Other';
        const amount = parseFloat(due.paid_amount) || 0;

        if (!acc[year]) {
          acc[year] = {
            year: year,
            Monthly: 0,
            Yearly: 0,
            Event: 0,
            Other: 0,
            Archived: 0
          };
        }

        if (due.isArchived) {
          acc[year].Archived += amount;
        } else {
          if (type === 'Monthly') acc[year].Monthly += amount;
          else if (type === 'Yearly') acc[year].Yearly += amount;
          else if (type === 'Event') acc[year].Event += amount;
          else acc[year].Other += amount;
        }

        return acc;
      }, {});

      if (Object.keys(yearlySummary).length === 0) {
        console.warn('No yearly data for dues chart, skipping');
        container.innerHTML = '<p>No data available for dues chart</p>';
        return;
      }

      const yearTotals = {};
      Object.values(yearlySummary).forEach(entry => {
        yearTotals[entry.year] =
          (entry.Monthly || 0) +
          (entry.Yearly || 0) +
          (entry.Event || 0) +
          (entry.Other || 0) +
          (entry.Archived || 0);
      });

      const chart = anychart.column();
      chart.yScale().stackMode('value');

      const categories = ['Monthly', 'Yearly', 'Event', 'Other', 'Archived'];

      categories.forEach(type => {
        const seriesData = Object.values(yearlySummary).map(item => ({
          x: item.year,
          value: item[type] || 0
        }));

        chart.column(seriesData)
          .name(type)
          .fill(type === 'Archived' ? '#6c757d' :
            (baseModule.colorConfig.types[type] || baseModule.colorConfig.types._default))
          .stroke(null);
      });

      chart.title('Total Dues').legend(true);
      chart.title().fontSize('18px');
      chart.title().fontWeight('bold');
      chart.title().fontColor('#313136');
      chart.title().hAlign('center');
      chart.title().padding([0, 10, 20, 30]);
      chart.xAxis().title('Year');

      chart.tooltip()
        .useHtml(true)
        .titleFormat('<span style="color:white; font-weight:bold;">{%seriesName} — {%x}</span>')
        .format(function () {
          const year = this.x;
          const value = this.value;
          const total = yearTotals[year] || 0;
          return `
            <span style="color:white;">Amount: ₱${value.toLocaleString()}</span><br>
            <span style="color:white;">Total Year: ₱${total.toLocaleString()}</span>
          `;
        });

      chart.container(containerId).draw();
    };

    const renderTypeChart = (data) => {
      const containerId = 'barChart_type';
      const container = document.getElementById(containerId);
      if (!container) {
        console.warn('barChart_type container not found');
        return;
      }
      container.innerHTML = '';

      const yearlyMonthlyGroups = data.reduce((acc, due) => {
        if (!due.due_date || typeof due.paid_amount === 'undefined') return acc;

        const year = due.due_date.slice(0, 4);
        const monthYear = due.due_date.slice(0, 7);
        const monthNum = parseInt(due.due_date.slice(5, 7)) - 1;
        if (isNaN(monthNum)) return acc;

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        if (!acc[year]) acc[year] = { year: year, months: {}, total: 0 };
        if (!acc[year].months[monthYear]) {
          acc[year].months[monthYear] = {
            monthName: monthNames[monthNum] || 'Unknown',
            monthNum: monthNum + 1,
            total: 0,
            items: []
          };
        }
        acc[year].total += parseFloat(due.paid_amount) || 0;
        acc[year].months[monthYear].total += parseFloat(due.paid_amount) || 0;
        acc[year].months[monthYear].items.push(due);
        return acc;
      }, {});

      if (Object.keys(yearlyMonthlyGroups).length === 0) {
        console.warn('No monthly data for type chart, skipping');
        container.innerHTML = '<p>No data available for type chart</p>';
        return;
      }

      const chart = anychart.bar();
      Object.entries(yearlyMonthlyGroups).forEach(([year, yearData]) => {
        const seriesData = Object.values(yearData.months).map(month => ({
          x: month.monthName,
          value: month.total
        }));
        chart.bar(seriesData).name(year).fill(getYearColor(year)).stroke(null);
      });
      chart.title("Monthly Dues by Year").legend(true);
      chart.title().fontSize('18px');
      chart.title().fontWeight('bold');
      chart.title().fontColor('#313136');
      chart.title().hAlign('center');
      chart.title().padding([0, 10, 20, 45]);
      chart.yAxis().title("Amount (₱)").labels().format("₱{%value}{groupsSeparator: }");
      chart.tooltip().format("{%seriesName} {%x}: ₱{%value}{groupsSeparator: }");
      chart.container(containerId).draw();
    };

    const getYearColor = (year) => ({
      '2023': '#4CAF50', '2024': '#2196F3', '2025': '#FF5722'
    }[year] || '#9E9E9E');

    const deleteDue = async (id) => {
      const cleanId = id.split(':')[0];
      
      if (confirm('Are you sure you want to delete this due?')) {
        try {
          document.querySelector(`tr[data-id="${cleanId}"]`)?.remove();
          document.querySelector(`.due-card[data-id="${cleanId}"]`)?.remove();

          const dueData = await fetchDueData(cleanId);
          
          await deleteDueData(cleanId).catch(error => {
            if (error.message.includes('404') || error.message.includes('not found')) {
              console.warn(`Due ${cleanId} already deleted or not found`);
            } else {
              throw error;
            }
          });

          if (dueData) {
            await logDueHistory(
              cleanId,
              dueData.homeowner_id || null,
              userProfile?.role === 'member' ? null : userProfile?.id,
              'Due Deleted',
              dueData,
              null,
              `Due ${cleanId} permanently deleted`
            );
          } else {
            console.warn(`Skipping history log for due ${cleanId} as it does not exist`);
          }

          baseModule.loadDues();
          SoundManager.playDelete();
        } catch (error) {
          console.error('Error deleting due:', error);
          alert('Failed to delete due: ' + error.message);
          baseModule.loadDues();
        }
      }
    };

    const markArchive = async (id) => {
      const cleanId = id.split(':')[0];
      const archivedDate = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).replace(',', '');

      if (confirm('Are you sure you want to archive this due?')) {
        try {
          const dueData = await fetchDueData(cleanId);
          
          await markAsArchive(cleanId, archivedDate);
          
          await logDueHistory(
            cleanId,
            dueData.homeowner_id,
            userProfile?.role === 'member' ? null : userProfile?.id,
            'Due Archived',
            dueData,
            { ...dueData, status: 'Archived', archived_date: archivedDate },
            `Due archived on ${archivedDate}`
          );

          document.querySelector(`tr[data-id="${cleanId}"]`)?.remove();
          document.querySelector(`.due-card[data-id="${cleanId}"]`)?.remove();
          
          document.getElementById('duePaymentModal')?.classList.remove('active');
          document.getElementById('partialReceiptContainer')?.classList.add('hidden');
          document.getElementById('partialEmptyState')?.classList.remove('hidden');

          const data = await baseModule.loadDues();
          renderCharts(data);

          SoundManager.playConfirmation();
        } catch (error) {
          console.error('Error archiving due:', error);
          alert('Failed to archive due. Please try again.');
        }
      }
    };

    const deleteReceipt = async () => {
      if (!baseModule.currentReceipt || !confirm('Delete this receipt?')) return;
      try {
        const dueData = await fetchDueData(baseModule.currentReceipt.id);
        
        await deleteDueData(baseModule.currentReceipt.id);
        
        await logDueHistory(
          baseModule.currentReceipt.id,
          dueData.homeowner_id,
          userProfile?.role === 'member' ? null : userProfile?.id,
          'Receipt Deleted',
          dueData,
          null,
          'Receipt deleted'
        );

        document.getElementById('receiptContainer').style.display = 'none';
        baseModule.currentReceipt = null;
        await baseModule.loadDues();
        SoundManager.playDelete();
      } catch (error) {
        console.error('Error deleting receipt:', error);
        alert('Failed to delete receipt. Please try again.');
      }
    };

    const restoreDue = async (id) => {
      if (confirm('Restore this due?')) {
        try {
          const dueData = await fetchDueData(id);
          
          await restoreDueData(id);
          
          await logDueHistory(
            id,
            dueData.homeowner_id,
            userProfile?.role === 'member' ? null : userProfile?.id,
            'Due Restored',
            { ...dueData, status: 'Archived' },
            { ...dueData, status: dueData.status || 'Pending Verification' },
            'Due restored from archive'
          );

          const data = await baseModule.loadDues();
          renderCharts(data);
          loadArchivedDues();
          SoundManager.playConfirmation();
        } catch (error) {
          console.error('Restore failed:', error);
          alert('Restore failed!');
        }
      }
      baseModule.loadDues();
    };

    const printReceipt = async () => {
      const receiptElement = document.querySelector('.receipt');
      if (!receiptElement) {
        alert('No receipt to print');
        return;
      }

      try {
        const logo = receiptElement.querySelector('.receipt-logo');
        const base64Logo = await toDataURL(logo.src);

        const clonedReceipt = receiptElement.cloneNode(true);
        const clonedLogo = clonedReceipt.querySelector('.receipt-logo');
        if (clonedLogo) clonedLogo.src = base64Logo;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <html>
            <head>
              <meta charset="UTF-8">
              <title>Receipt Print</title>
              <style>
                @page {
                  size: 72mm auto;
                  margin: 0;
                }

                body {
                  width: 72mm;
                  padding: 0 4mm;
                  margin: 0 auto;
                  box-sizing: border-box;
                  font-family: Arial, sans-serif;
                  font-size: 10.75px;
                  line-height: 1.4;
                  background: white;
                  -webkit-print-color-adjust: exact;
                }

                .receipt {
                  width: 100%;
                  padding: 0 .5mm;
                  box-sizing: border-box;
                  background: white;
                  border-radius: 8px;
                  margin-bottom: 20px;
                }

                .logos-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 20px;
                  padding-bottom: 20px;
                  border-bottom: 2px dashed #e0e0e0;
                }

                .receipt-logo {
                  width: 60px;
                  height: 60px;
                  border-radius: 50%;
                  object-fit: cover;
                }

                .header-text h2 {
                  font-size: 1rem;
                  margin-bottom: 5px;
                }

                .header-text p {
                  font-size: 0.6rem;
                  margin-bottom: 3px;
                  color: #555;
                }

                .official-receipt {
                  font-weight: bold;
                  margin-top: 5px;
                }

                .receipt-row {
                  display: flex;
                  justify-content: space-between;
                  padding: 2px 0;
                  font-size: 10.75px;
                  word-wrap: break-word;
                  word-break: break-word;
                }

                .receipt-row span:first-child {
                  flex: 1;
                  text-align: left;
                }

                .receipt-row span:last-child {
                  flex: 1;
                  text-align: right;
                }

                .total-row {
                  font-weight: bold;
                  border-top: 2px solid #333;
                  padding-top: 6px;
                  margin-top: 6px;
                }

                .receipt-footer {
                  border-top: 2px dashed #eee;
                  text-align: center;
                  margin-top: 15px;
                  font-style: italic;
                  color: #444;
                }

                .action-buttons, .hidden, .no-print {
                  display: none !important;
                }

                @media print {
                  body {
                    transform: scale(1);
                    zoom: 1;
                  }
                }
              </style>
            </head>
            <body>
              ${clonedReceipt.outerHTML}
            </body>
          </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        printWindow.onload = () => {
          printWindow.print();
          printWindow.close();
        };
      } catch (error) {
        console.error('Print failed:', error);
        alert(`Failed to print receipt: ${error}`);
      }
    };

    const toDataURL = url => new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      xhr.responseType = 'blob';
      
      xhr.onload = () => {
        if (xhr.status !== 200) return reject(`Failed to fetch image: ${xhr.statusText}`);
        
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject('Error reading image blob');
        reader.readAsDataURL(xhr.response);
      };
      
      xhr.onerror = () => reject('Network error while fetching image');
      xhr.send();
    });

    const loadArchivedDues = async () => {
      try {
        const archivedDues = await fetchArchivedDues();
        renderArchiveTable(archivedDues);
      } catch (error) {
        console.error('Error loading archived dues:', error);
        alert('Failed to load archived dues.');
      }
    };

    const renderArchiveTable = (data) => {
  const tbody = document.getElementById('archiveTable');
  if (!tbody) {
    console.warn('archiveTable element not found');
    return;
  }

  tbody.innerHTML = data.length ? data.map(d => `
    <tr data-id="${d.id}">
      <td>${d.receipt_no || 'N/A'}</td>
      <td>${d.full_name || 'N/A'}</td>
      <td>${d.type || 'N/A'}</td>
      <td>₱${d.amount || '0'}</td>
      <td>₱${d.paid_amount || '0'}</td>
      <td>${d.due_date || 'N/A'}</td>
      <td style="color: #6c757d">Archived</td>
      <td>${d.archived_date || 'N/A'}</td>
      <td>${d.notes || 'N/A'}</td>
      <td>
        <button class="restore-btn" data-id="${d.id}">
          <i class="fas fa-undo"></i> Restore
        </button>
        <button class="delete-btn" data-id="${d.id}">
          <i class="fas fa-trash-alt"></i> Delete
        </button>
      </td>
    </tr>
  `).join('') : `
    <tr>
      <td class="center-cell" colspan="10">
        <div class="no-data">
          <i class="fa fa-box-open" style="font-size:5rem; color: #888;"></i>
          <p>No dues found</p>
        </div>
      </td>
    </tr>
  `;

  document.querySelectorAll('.restore-btn').forEach(btn => {
    btn.addEventListener('click', () => restoreDue(btn.dataset.id));
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deletePermanent(btn.dataset.id));
  });
};
    const deletePermanent = async (id) => {
      if (confirm('Permanently delete this due?')) {
        try {
          const dueData = await fetchDueData(id);
          
          await deleteDueData(id);
          
          await logDueHistory(
            id,
            dueData.homeowner_id,
            userProfile?.role === 'member' ? null : userProfile?.id,
            'Due Permanently Deleted',
            dueData,
            null,
            'Due permanently deleted from archive'
          );

          loadArchivedDues();
          SoundManager.playDelete();
        } catch (error) {
          console.error('Permanent delete failed:', error);
          alert('Delete failed!');
        }
      }
    };

    const switchView = async (view) => {
      const listView = document.getElementById('dueListView');
      const cardView = document.getElementById('dueCardView');
      const chartView = document.getElementById('dueChartView');
      const archiveView = document.getElementById('dueArchiveView');

      if (listView) listView.style.display = 'none';
      if (cardView) cardView.style.display = 'none';
      if (chartView) chartView.style.display = 'none';
      if (archiveView) archiveView.style.display = 'none';

      if (view === 'list' && listView) {
        listView.style.display = 'table';
        const data = await baseModule.loadDues();
        filterDues('', true);
      } else if (view === 'card' && cardView) {
        cardView.style.display = 'grid';
        const data = await baseModule.loadDues();
        filterDues('', true);
      } else if (view === 'chart' && chartView) {
        chartView.style.display = 'flex';
        console.log('Switching to chart view, rendering charts');
        const data = await baseModule.loadDues();
        renderCharts(data);
      } else if (view === 'archive' && archiveView) {
        archiveView.style.display = 'table';
        loadArchivedDues();
      }
    };


    const attachTableListeners = () => {
      document.querySelectorAll('.mark-paid-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const dueId = btn.dataset.id;
          baseModule.openPaymentForm(dueId);
        });
      });

      document.querySelectorAll('.add-note-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const dueId = btn.dataset.id;
          baseModule.openNote(dueId);
        });
      });

      document.querySelectorAll('.mark-archive-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          markArchive(btn.dataset.id);
        });
      });

      document.querySelectorAll('.due-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          deleteDue(btn.dataset.id);
        });
      });

      document.querySelectorAll('.restore-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          restoreDue(btn.dataset.id);
        });
      });
    };

    const attachCardListeners = () => {
      const container = document.getElementById('dueCardView');
      if (!container) return;

      container.querySelectorAll('.mark-paid-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const dueId = btn.dataset.id;
          baseModule.openPaymentForm(dueId);
        });
      });

      container.querySelectorAll('.add-note-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const dueId = btn.dataset.id;
          baseModule.openNote(dueId);
        });
      });

      container.querySelectorAll('.mark-archive-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          markArchive(btn.dataset.id);
        });
      });

      container.querySelectorAll('.due-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          deleteDue(btn.dataset.id);
        });
      });

      container.querySelectorAll('.restore-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          restoreDue(btn.dataset.id);
        });
      });
    };

    return {
      init,
      loadDues: baseModule.loadDues,
      closeCreateModal: () => document.getElementById('createDueModal')?.classList.remove('active'),
      switchView,
      openForm: () => document.getElementById('createDueModal')?.classList.add('active'),
      openPaymentForm: baseModule.openPaymentForm,
      deleteDue,
      printReceipt,
      deleteReceipt,
      markArchive,
      openNote: baseModule.openNote,
      closeNote: baseModule.closeNote,
      closePaymentForm: baseModule.closePaymentForm,
      saveNote: baseModule.saveNote,
      loadArchivedDues,
      restoreDue,
      deletePermanent,
      partialPayment: baseModule.partialPayment
    };
  };

  const member = () => {
    const baseModule = base();

    const init = () => {
      const domLoaded = () => {
        setupEventListeners();
        attachTableListeners();
        attachCardListeners();
        if (!userProfile?.id) {
          console.error('No user ID found in userProfile');
          window.location.assign('/index.html');
          return;
        }
        baseModule.loadUserDues(userProfile.id).then(data => {
          baseModule.filterUserDues(data, '');
        });
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', domLoaded);
      } else {
        domLoaded();
      }

      if (baseModule.partialForm) {
        const newForm = baseModule.partialForm.cloneNode(true);
        baseModule.partialForm.parentNode.replaceChild(newForm, baseModule.partialForm);
        baseModule.partialForm = newForm;

        baseModule.partialForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (baseModule.partialForm.dataset.submitting === 'true') {
            console.log('Ignoring duplicate partial payment submission');
            return;
          }
          console.log('Partial form submitted (member)');
          baseModule.partialForm.dataset.submitting = 'true';
          try {
            await baseModule.partialPayment();
          } finally {
            setTimeout(() => {
              baseModule.partialForm.dataset.submitting = 'false';
            }, 1000);
          }
        }, { once: false });
      } else {
        console.warn('partialPaymentForm not found');
      }
    };

    const setupEventListeners = () => {
      const searchInput = document.getElementById('searchDue');
      const statusFilter = document.getElementById('due_statusFilter');
      const categoryFilter = document.getElementById('due_categoryFilter');
      const printBtn = document.getElementById('printReceiptBtn');

      if (searchInput) {
        searchInput.addEventListener('input', baseModule.debounce((e) => {
          if (!userProfile?.id) {
            console.error('No user ID found in userProfile');
            return;
          }
          baseModule.loadUserDues(userProfile.id).then(data => {
            baseModule.filterUserDues(data, e.target.value.trim());
          });
        }, 300));
      } else {
        console.warn('searchDue element not found');
      }

      [statusFilter, categoryFilter].forEach(filter => {
        if (filter) {
          filter.addEventListener('change', () => {
            if (!userProfile?.id) {
              console.error('No user ID found in userProfile');
              return;
            }
            baseModule.loadUserDues(userProfile.id).then(data => {
              const searchTerm = document.getElementById('searchDue')?.value.trim() || '';
              baseModule.filterUserDues(data, searchTerm);
            });
          });
        } else {
          console.warn(`Filter element not found: ${filter ? 'categoryFilter' : 'statusFilter'}`);
        }
      });

      if (printBtn) {
        printBtn.addEventListener('click', printReceipt);
      } else {
        console.warn('printReceiptBtn element not found');
      }
    };

    const switchView = (view) => {
      const listView = document.getElementById('dueListView');
      const cardView = document.getElementById('dueCardView');

      if (listView) listView.style.display = 'none';
      if (cardView) cardView.style.display = 'none';

      if (view === 'list' && listView) {
        listView.style.display = 'table';
        if (userProfile?.id) {
          baseModule.loadUserDues(userProfile.id).then(data => {
            baseModule.filterUserDues(data, '');
          });
        }
      } else if (view === 'card' && cardView) {
        cardView.style.display = 'grid';
        if (userProfile?.id) {
          baseModule.loadUserDues(userProfile.id).then(data => {
            baseModule.filterUserDues(data, ''); console.log(data);
          });
        }
      }
    };

    const attachTableListeners = () => {
      const table = document.getElementById('dueListView');
      if (!table) return;

      table.addEventListener('click', (e) => {
        const btn = e.target.closest('.mark-paid-btn, .add-note-btn');
        if (!btn) return;

        const dueId = btn.dataset.id;
        if (btn.classList.contains('mark-paid-btn')) {
          baseModule.openPaymentForm(dueId);
        } else if (btn.classList.contains('add-note-btn')) {
          e.preventDefault();
          baseModule.openNote(dueId);
        }
      });
    };

    const toDataURL = url => new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      xhr.responseType = 'blob';
      
      xhr.onload = () => {
        if (xhr.status !== 200) return reject(`Failed to fetch image: ${xhr.statusText}`);
        
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject('Error reading image blob');
        reader.readAsDataURL(xhr.response);
      };
      
      xhr.onerror = () => reject('Network error while fetching image');
      xhr.send();
    });

    const printReceipt = async () => {
      const receiptElement = document.querySelector('.receipt');
      if (!receiptElement) {
        alert('No receipt to print');
        return;
      }

      try {
        const logo = receiptElement.querySelector('.receipt-logo');
        const base64Logo = await toDataURL(logo.src);

        const clonedReceipt = receiptElement.cloneNode(true);
        const clonedLogo = clonedReceipt.querySelector('.receipt-logo');
        if (clonedLogo) clonedLogo.src = base64Logo;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
          <html>
            <head>
              <meta charset="UTF-8">
              <title>Receipt Print</title>
              <style>
                @page {
                  size: 72mm auto;
                  margin: 0;
                }

                body {
                  width: 72mm;
                  padding: 0 4mm;
                  margin: 0 auto;
                  box-sizing: border-box;
                  font-family: Arial, sans-serif;
                  font-size: 10.75px;
                  line-height: 1.4;
                  background: white;
                  -webkit-print-color-adjust: exact;
                }

                .receipt {
                  width: 100%;
                  padding: 0 .5mm;
                  box-sizing: border-box;
                  background: white;
                  border-radius: 8px;
                  margin-bottom: 20px;
                }

                .logos-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 20px;
                  padding-bottom: 20px;
                  border-bottom: 2px dashed #e0e0e0;
                }

                .receipt-logo {
                  width: 60px;
                  height: 60px;
                  border-radius: 50%;
                  object-fit: cover;
                }

                .header-text h2 {
                  font-size: 1rem;
                  margin-bottom: 5px;
                }

                .header-text p {
                  font-size: 0.6rem;
                  margin-bottom: 3px;
                  color: #555;
                }

                .official-receipt {
                  font-weight: bold;
                  margin-top: 5px;
                }

                .receipt-row {
                  display: flex;
                  justify-content: space-between;
                  padding: 2px 0;
                  font-size: 10.75px;
                  word-wrap: break-word;
                  word-break: break-word;
                }

                .receipt-row span:first-child {
                  flex: 1;
                  text-align: left;
                }

                .receipt-row span:last-child {
                  flex: 1;
                  text-align: right;
                }

                .total-row {
                  font-weight: bold;
                  border-top: 2px solid #333;
                  padding-top: 6px;
                  margin-top: 6px;
                }

                .receipt-footer {
                  border-top: 2px dashed #eee;
                  text-align: center;
                  margin-top: 15px;
                  font-style: italic;
                  color: #444;
                }

                .action-buttons, .hidden, .no-print {
                  display: none !important;
                }

                @media print {
                  body {
                    transform: scale(1);
                    zoom: 1;
                  }
                }
              </style>
            </head>
            <body>
              ${clonedReceipt.outerHTML}
            </body>
          </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        printWindow.onload = () => {
          printWindow.print();
          printWindow.close();
        };
      } catch (error) {
        console.error('Print failed:', error);
        alert(`Failed to print receipt: ${error}`);
      }
    };

    const attachCardListeners = () => {
      const container = document.getElementById('dueCardView');
      if (!container) return;

      container.addEventListener('click', (e) => {
        const btn = e.target.closest('.mark-paid-btn, .add-note-btn', '.due-print-btn');
        if (!btn) return;

        const dueId = btn.dataset.id;
        if (btn.classList.contains('mark-paid-btn')) {
          baseModule.openPaymentForm(dueId);
        } else if (btn.classList.contains('add-note-btn')) {
          e.preventDefault();
          baseModule.openNote(dueId);
        } else if (btn.classList.classList.contains('due-print-btn')) {
          e.preventDefault();
          printReceipt();
        }
      });
    };

    return {
      init,
      loadUserDues: baseModule.loadUserDues,
      switchView,
      openPaymentForm: baseModule.openPaymentForm,
      closePaymentForm: baseModule.closePaymentForm,
      saveNote: baseModule.saveNote,
      openNote: baseModule.openNote,
      closeNote: baseModule.closeNote,
      partialPayment: baseModule.partialPayment,
      printReceipt
    };
  };

  return { staff, member };
})();

export default due;
window.due = due;

document.addEventListener('DOMContentLoaded', () => {
  const userProfile = JSON.parse(localStorage.getItem('user'));

  if (!userProfile || !userProfile.role) {
    console.error('No valid user profile found');
    window.location.assign('/index.html');
    return;
  }

  const role = userProfile.role.toLowerCase();

  switch (role) {
    case 'president':
      due.staff().init();
      break;
    case 'vice_president':
      due.staff().init();
      break;
    case 'secretary':
      due.staff().init();
      break;
    case 'auditor':
      due.staff().init();
      break;
    case 'treasurer':
      due.staff().init();
      break;
    case 'member':
      due.member().init();
      break;  
    default:
      logoutUser();
  }
});