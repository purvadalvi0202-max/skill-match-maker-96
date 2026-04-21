import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

interface Resume {
  name: string;
  score: number | null;
  status: string | null;
}

export function ScoreBarChart({ resumes }: { resumes: Resume[] }) {
  const data = {
    labels: resumes.map(r => r.name.split(' - ')[0] || r.name),
    datasets: [{
      label: 'Match Score (%)',
      data: resumes.map(r => r.score ?? 0),
      backgroundColor: resumes.map(r => {
        const s = r.score ?? 0;
        if (s >= 70) return 'hsla(142, 71%, 45%, 0.7)';
        if (s >= 40) return 'hsla(38, 92%, 50%, 0.7)';
        return 'hsla(0, 84%, 60%, 0.7)';
      }),
      borderRadius: 8,
      borderSkipped: false,
    }],
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-heading font-bold text-foreground">Score Comparison</h3>
      <p className="text-xs text-muted-foreground mb-4">
        ATS match score (%) per candidate — higher means better fit for the selected job description.
      </p>
      <Bar data={data} options={{
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, max: 100, grid: { color: 'hsla(214, 32%, 91%, 0.5)' } }, x: { grid: { display: false } } },
      }} />
    </div>
  );
}

export function StatusDoughnut({ resumes }: { resumes: Resume[] }) {
  const good = resumes.filter(r => r.status === 'Good').length;
  const avg = resumes.filter(r => r.status === 'Average').length;
  const poor = resumes.filter(r => r.status === 'Poor').length;

  const data = {
    labels: ['Good', 'Average', 'Poor'],
    datasets: [{
      data: [good, avg, poor],
      backgroundColor: ['hsla(142, 71%, 45%, 0.8)', 'hsla(38, 92%, 50%, 0.8)', 'hsla(0, 84%, 60%, 0.8)'],
      borderWidth: 0,
    }],
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-heading font-bold mb-4 text-foreground">Status Distribution</h3>
      <div className="max-w-[250px] mx-auto">
        <Doughnut data={data} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
      </div>
    </div>
  );
}
