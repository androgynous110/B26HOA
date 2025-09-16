import { fetchAnnouncements, currentAnnouncement } from '../api/api-announcement.js';
import { fetchNotifications } from '../api/api-notification.js';
import { fetchHomeowners } from '../api/api-homeowner.js';
import { fetchDues, currentDue} from '../api/api-dues.js';
import { fetchEventsForMonth } from '../api/api-calendarEvent.js';
import { fetchConcerns, userfetchConcerns, currentConcern } from '../api/api-concerns.js';
import { protectRoute, logoutUser } from '../api/auth-guard.js';
import { userfetchHistoryLog } from '../utils/historyLogs.js';
import { supabase } from '../api/supabaseConfiguration.js';

const dashboard = (() => {
  const userProfile = JSON.parse(localStorage.getItem('user'));
  const user_id = userProfile?.id;

  const staff = () => {
    const notificationSection = async () => {
      try {
        const notification = await fetchNotifications();
        const unreadCount = notification.filter(a => !a.is_read).length;

        const notificationIndicator = document.getElementById('notification-indicator');
        if (notificationIndicator) {
          notificationIndicator.querySelector('h1').textContent = unreadCount || '0';
        }
        const notificationBadge = document.getElementById('notificationBadge');
        if (notificationBadge) {
          notificationBadge.textContent = unreadCount || '0';
        }
      } catch (e) {
        console.error('notificationSection error:', e);
      }
    };

    const announcementSection = async () => {
      try {
        const announcements = await fetchAnnouncements();
        const unreadCount = announcements.filter(a => !a.is_read).length;

        const announcementIndicator = document.getElementById('announcement-indicator');
        if (announcementIndicator) {
          announcementIndicator.querySelector('h1').textContent = unreadCount || '0';
        }
        const announcementBadge = document.getElementById('announcementBadge');
        if (announcementBadge) {
          announcementBadge.textContent = unreadCount || '0';
        }
      } catch (e) {
        console.error('announcementSection error:', e);
      }
    };

    const homeownerSection = async () => {
      try {
        const homeowners = await fetchHomeowners();
        const activeCount = Array.isArray(homeowners)
          ? homeowners.filter(h => String(h.status).toLowerCase() === 'active').length
          : 0;

        const homeownerIndicator = document.getElementById('homeowner-indicator');
        if (homeownerIndicator) {
          homeownerIndicator.querySelector('h1').textContent = String(activeCount);
        }
      } catch (e) {
        console.error('homeownerSection error:', e);
      }
    };

    const dueSection = async () => {
      try {
        const dues = await fetchDues();
        const unarchive = dues.filter(a => !a.archived).length;

        const dueIndicator = document.getElementById('due-indicator');
        if (dueIndicator) {
          dueIndicator.querySelector('h1').textContent = unarchive || '0';
        }
      } catch (e) {
        console.error('dueSection error:', e);
      }
    };

    const eventSection = async () => {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        const { data: events, error } = await fetchEventsForMonth(year, month);
        const currentMonthEvents = error ? 0 : (events?.length || 0);

        const eventIndicator = document.getElementById('event-indicator');
        if (eventIndicator) {
          eventIndicator.querySelector('h1').textContent = String(currentMonthEvents);
        }
      } catch (e) {
        console.error('eventSection error:', e);
      }
    };

    const concernSection = async () => {
      try {
        const concerns = await fetchConcerns();
        const unresolved = concerns.filter(a => !a.is_resolved).length;

        const concernIndicator = document.getElementById('concern-indicator');
        if (concernIndicator) {
          concernIndicator.querySelector('h1').textContent = unresolved || '0';
        }
      } catch (e) {
        console.error('concernSection error:', e);
      }
    };

    const displayHistoryLog = async () => {
      try {
        const { data: logs, error: logError } = await supabase
          .from('due_history')
          .select('*');

        if (logError) {
          console.error('Error fetching history logs:', logError);
          throw logError;
        }
        
        const tbody = document.getElementById('tableHistoryLog');
        if (!tbody) {
          console.error('Table body element not found');
          return;
        }
        
        tbody.innerHTML = '';
        
        if (!logs || logs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="3">No history logs available</td></tr>';
          return;
        }

        const { data: homeowners, error: homeownerError } = await supabase
          .from('homeowners')
          .select('id, first_name, last_name');

        if (homeownerError) {
          console.error('Error fetching homeowner data:', homeownerError);
          throw homeownerError;
        }

        const homeownerMap = new Map();
        homeowners.forEach(homeowner => {
          homeownerMap.set(homeowner.id, `${homeowner.first_name} ${homeowner.last_name}`);
        });

        logs.forEach(log => {
          const row = document.createElement('tr');
          
          row.innerHTML = `
            <td>${homeownerMap.get(log.homeowner_id) || 'Name not available'}</td>
            <td>${log.remarks || 'N/A'}</td>
            <td>${log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}</td>
          `;
          
          tbody.appendChild(row);
        });
      } catch (error) {
        console.error('Display error:', error);
        const tbody = document.getElementById('tableHistoryLog');
        if (tbody) {
          tbody.innerHTML = `<tr><td colspan="3">Error: ${error.message || 'Unknown error'}</td></tr>`;
        }
      }
    };


    return {
      notificationSection,
      announcementSection,
      homeownerSection,
      dueSection,
      eventSection,
      concernSection,
      displayHistoryLog,
    };
  };

  const member = () => {
    const currentDueSection = async () => {
      try {
        const { data: dues, error } = await currentDue(userProfile.id);
        if (error) {
          console.error('Error fetching current due:', error.message);
          return;
        }

        const container = document.getElementById('card-duePayment');
        if (!container) {
          console.error('card-duePayment container not found in DOM');
          return;
        }

        const cardBody = container.querySelector('.card-body');
        if (!cardBody) {
          console.error('card-body not found in card-duePayment');
          return;
        }

        cardBody.innerHTML = ''; 
        if (dues.length > 0) {
          const d = dues[0]; 
          const card = document.createElement('div');
          card.className = 'card-body-item';

          card.innerHTML = `
            <div class="list-item">
              <span class="list-title">Due Bill</span>
              <span class="list-value">₱${d.amount || 'N/A'}</span>
            </div>
            <div class="list-item">
              <span class="list-title">Due Date</span>
              <span class="list-value">${new Date(d.due_date).toLocaleDateString() || 'N/A'}</span>
            </div>
            <div class="list-item">
              <span class="list-title">Status</span>
              <span class="status-badge badge-none">${d.status || 'Due'}</span>
            </div>
            <div class="list-item">
              <span class="list-title">Homeowner</span>
              <span class="list-value">${d.homeowners ? `${d.homeowners.first_name} ${d.homeowners.last_name}` : 'Unknown'}</span>
            </div>
          `;

          cardBody.appendChild(card);
        } else {
          cardBody.innerHTML = `<div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                width: 100%;
                margin-top:1.8rem;
              ">
                <i class="fa-solid fa-user-check" style="font-size: 80px; color: #888;"></i>
                <div style="margin-top: 0.5rem; color: #888;">No Recent Due Bills Found.</div>
              </div>`; 
        }

        const dueIndicator = document.getElementById('due-indicator');
        if (dueIndicator) {
          dueIndicator.querySelector('h1').textContent = dues.length || '0';
        }
      } catch (e) {
        console.error('currentDueSection error:', e);
      }
    };

    const announcementsSection = async () => {
      try {
        const { data: announcements, error } = await currentAnnouncement();
        if (error) {
          console.error('Error fetching current announcement:', error.message);
          return;
        }

        const container = document.getElementById('card-anouncement');
        if (!container) {
          console.error('card-anouncement container not found in DOM');
          return;
        }

        const cardBody = container.querySelector('.card-body');
        if (!cardBody) {
          console.error('card-body not found in card-anouncement');
          return;
        }

        cardBody.innerHTML = '';

        if (announcements.length > 0) {
          
          announcements.forEach(a => {
              const card = document.createElement('div');
              card.className = 'card-body-item';

              card.innerHTML = `
                <div class="list-item">
                  <i class="fas fa-info-circle" style="color: #128603;"></i>
                  <strong><span class="list-value"  style="color: #353535ff">${a.announcement_title || 'N/A'}</span></strong>
                </div>
              `;

              cardBody.appendChild(card);
            });
          
        } else {
          cardBody.innerHTML = '<p>No recent announcements found.</p>';
        }
      } catch (e) {
        console.error('announcementsSection error:', e);
      }
    };

    const concernSection = async () => {
      try {
      const userConcerns = (await userfetchConcerns(user_id)) || [];
      const latestConcernData = (await currentConcern(user_id))?.data || [];

      const recentCount = latestConcernData.length;
      const concerns = userConcerns.length;
      const unresolved = userConcerns.filter(c => !c.is_resolved).length;
      const resolved = userConcerns.filter(c => c.is_resolved).length;

      const recentConcern = document.getElementById('userRecentConcerns');
      const concernIndicator = document.getElementById('userConcerns');
      const concernResolved = document.getElementById('userConcernResolved');
      const concernUnresolved = document.getElementById('userConcernUnresolved');

      if (recentConcern) {
        recentConcern.querySelector('h3').textContent = recentCount.toString();
      }
      if (concernIndicator) {
        concernIndicator.querySelector('h3').textContent = concerns.toString();
      }
      if (concernResolved) {
        concernResolved.querySelector('h3').textContent = resolved.toString(); 
      }
      if (concernUnresolved) {
        concernUnresolved.querySelector('h3').textContent = unresolved.toString();
      }

    } catch (e) {
      console.error('concernSection error:', e);
    }
  }

  const displayHistoryLog = async () => {
    const userProfile = JSON.parse(localStorage.getItem('user'));
    const user_id = userProfile?.id;

    const homeownerId = String(user_id);

    try {
      const logs = await userfetchHistoryLog(homeownerId);
      
      const tbody = document.getElementById('tableHistoryLog');
      if (!tbody) {
        console.error('Table body element not found');
        return;
      }
      
      tbody.innerHTML = '';
      
      if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">No history logs available</td></tr>';
        return;
      }
      
      const { data: homeownerData, error: homeownerError } = await supabase
        .from('homeowners')
        .select('id, first_name, last_name')
        .eq('id', homeownerId)
        .single();

      if (homeownerError) {
        console.error('Error fetching homeowner data:', homeownerError);
        throw homeownerError;
      }

      const homeownerName = homeownerData ? `${homeownerData.first_name} ${homeownerData.last_name}` : 'Name not available';

      logs.forEach(log => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
          <td>${homeownerName}</td>
          <td>${log.remarks || 'N/A'}</td>
          <td>${log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}</td>
        `;
        
        tbody.appendChild(row);
      });
    } catch (error) {
      console.error('Display error:', error);
      const tbody = document.getElementById('tableHistoryLog');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="3">Error: ${error.message || 'Unknown error'}</td></tr>`;
      }
    }
  };

              

    return {
      currentDueSection,
      announcementsSection,
      concernSection,
      displayHistoryLog,
    };
  };

  return { staff, member };
})();

const init = async () => {
  try {
    const isAuthenticated = await protectRoute('/index.html');
    if (!isAuthenticated) {
      console.log('Not authenticated, redirect handled by protectRoute');
      return;
    }

    const userProfile = JSON.parse(localStorage.getItem('user'));
    
    if (!userProfile || !userProfile.role) {
      console.error('No valid user profile found');
      window.location.assign('/index.html');
      return;
    }

    const currentUserType = userProfile.role || 'user';

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('Logout button clicked');
        await logoutUser();
      });
    } else {
      console.warn('Logout button not found in DOM');
    }

        if (['president', 'vice_president', 'secretary', 'auditor', 'treasurer'].includes(currentUserType)) {
      const staffDashboard = dashboard.staff();
      await Promise.all([
        staffDashboard.notificationSection(),
        staffDashboard.announcementSection(),
        staffDashboard.homeownerSection(),
        staffDashboard.dueSection(),
        staffDashboard.eventSection(),
        staffDashboard.concernSection(),
        staffDashboard.displayHistoryLog(),
      ]);
    } else if (currentUserType === 'member') {
      const userDashboard = dashboard.member();
      await Promise.all([
        userDashboard.currentDueSection(),
        userDashboard.announcementsSection(),
        userDashboard.concernSection(),
        userDashboard.displayHistoryLog(),
      ]);
    } else {
      console.error('Unknown role:', currentUserType);
      window.location.assign('/index.html');
    }
  } catch (err) {
    console.error('Dashboard init error:', err);
    window.location.assign('/index.html');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  init();
});