export const notifTypes = {
  'warning': '#f44336',
  'dues': '#ff8400ff',
  'announcement' : ' #4ad5ff',
  'event' : '#9C27B0',
  'concern' : '#FF5722'
}

export const colorConfig = {
    status: {
    'Complete': '#228116',
    'On going': '#FFA500',
    'Overdue': '#f44336',
    '_default': '#9E9E9E'
    },
    types: {
    'Monthly': '#2196F3',
    'Yearly': '#FF5722',
    'Event': '#FFEB3B',
    'Other': '#9C27B0',
    '_default': '#607D8B'
    }
};

export const getStatusColor = (status) => {
  const colorMap = { 'Read': '#228116', 'Unread': '#f44336' };
  return colorMap[status] || '#9E9E9E';
};

export const getHomeownerStatusColor = (status) => {
    const normalizedStatus = (status || '').toLowerCase();
    const colorMap = {
      'active': '#228116',
      'inactive': '#f44336',
    };
    return colorMap[normalizedStatus] || '#9E9E9E';
};

export const getConcernStatusColor = (status) => {
    const colorMap = {
    'Resolved': '#228116',
    'Unresolved': '#f44336',
    };
    return colorMap[status] || '#9E9E9E';
};