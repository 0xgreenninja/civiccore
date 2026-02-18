
import React from 'react';

export const COLORS = {
  primary: '#FF8C00', // Deep Orange
  secondary: '#2E7D32', // Forest Green
  accent: '#FFFFFF',    // Pure White
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    500: '#6B7280',
    800: '#1F2937',
  }
};

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Education: <i className="fas fa-graduation-cap text-orange-500"></i>,
  Healthcare: <i className="fas fa-hospital text-green-600"></i>,
  Agriculture: <i className="fas fa-seedling text-green-700"></i>,
  Infrastructure: <i className="fas fa-bridge text-blue-500"></i>,
};
