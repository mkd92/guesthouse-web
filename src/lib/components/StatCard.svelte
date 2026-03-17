<script>
  export let title = '';
  export let value = '';
  export let icon = '';
  export let color = 'blue'; // blue, green, red, yellow, purple

  const iconColors = {
    blue:   { bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.15)' },
    green:  { bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.15)' },
    red:    { bg: 'rgba(251,113,133,0.1)', border: 'rgba(251,113,133,0.15)' },
    yellow: { bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.15)' },
    purple: { bg: 'rgba(192,132,252,0.1)', border: 'rgba(192,132,252,0.15)' },
  };
</script>

<div class="card">
  <div class="flex items-start justify-between gap-3">
    <div class="flex-1 min-w-0">
      <p class="text-[10px] font-bold uppercase tracking-widest mb-2" style="color: var(--text-3);">{title}</p>
      <p class="text-2xl font-bold leading-none tracking-tight" style="color: var(--text-1);">{value}</p>
    </div>
    <div
      class="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
      style="background: {iconColors[color].bg}; border: 1px solid {iconColors[color].border};"
    >
      {icon}
    </div>
  </div>
</div>
