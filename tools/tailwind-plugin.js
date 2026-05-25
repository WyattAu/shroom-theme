const plugin = require('tailwindcss/plugin');

const colors = {
  bg: '#24212E',
  'bg-surface': '#1E1C29',
  'bg-hover': '#2A2840',
  fg: '#CCC8D9',
  'fg-muted': '#726D89',
  purple: '#BE9AF7',
  teal: '#74D7C8',
  green: '#A6C18B',
  amber: '#E8C990',
  red: '#E68484',
  pink: '#FF79C6',
  cyan: '#89DDFF',
  blue: '#82AAFF',
  orange: '#F07178',
  border: '#393552',
  selection: '#393552',
};

const cssProperties = Object.fromEntries(
  Object.entries(colors).map(([name, value]) => [`--shroom-${name}`, value])
);

module.exports = plugin.withOptions(
  () => ({ addBase, addUtilities }) => {
    addBase({
      ':root': cssProperties,
    });

    addUtilities({
      '.shroom-selection': {
        'background-color': 'var(--shroom-selection)',
      },
    });
  },
  () => ({
    theme: {
      extend: {
        colors: {
          shroom: colors,
        },
      },
    },
  })
);
