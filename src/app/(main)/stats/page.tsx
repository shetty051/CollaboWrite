"use client";

import { useEffect, useState } from "react";
import { getStatsData } from "@/app/actions/stats";
import { Card } from "@/components/ui/Card/Card";
import styles from "./stats.module.css";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Activity, Star, Eye, MessageSquare, TrendingUp, Users } from "lucide-react";

import { StatsExport } from "@/components/StatsExport/StatsExport";

const COLORS = ['#e17055', '#fdcb6e', '#00b894', '#0984e3', '#6c5ce7', '#d63031'];

export default function StatsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<string>("ALL");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const res = await getStatsData(selectedStory === "ALL" ? null : selectedStory);
      setData(res);
      setLoading(false);
    };
    fetchData();
  }, [selectedStory]);

  if (loading) return <div className={styles.loading}>Loading analytics...</div>;

  if (data?.empty) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Analytics Dashboard</h1>
        </header>
        <div className={styles.emptyState}>
          <Activity size={48} className={styles.emptyIcon} />
          <h2>Not enough data yet</h2>
          <p>Publish a story and share it to start collecting analytics on your audience.</p>
        </div>
      </div>
    );
  }

  const { summary, ratingsTrend, viewsChart, demographics, storyOptions } = data;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Analytics Dashboard</h1>
        
        <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
          <select 
            className={styles.storySelect}
            value={selectedStory}
            onChange={(e) => setSelectedStory(e.target.value)}
          >
            <option value="ALL">All Stories</option>
            {storyOptions.map((opt: any) => (
              <option key={opt.id} value={opt.id}>{opt.title}</option>
            ))}
          </select>
          <StatsExport data={data} selectedStory={selectedStory} />
        </div>
      </header>

      {/* Top Metrics */}
      <section className={styles.metricsGrid}>
        <Card className={styles.metricCard}>
          <div className={styles.metricIconWrap}><Eye size={24} className={styles.metricIcon} /></div>
          <div>
            <p className={styles.metricLabel}>Total Views</p>
            <p className={styles.metricValue}>{summary.totalViews}</p>
          </div>
        </Card>
        
        <Card className={styles.metricCard}>
          <div className={styles.metricIconWrap}><MessageSquare size={24} className={styles.metricIcon} /></div>
          <div>
            <p className={styles.metricLabel}>Total Reviews</p>
            <p className={styles.metricValue}>{summary.totalReviews}</p>
          </div>
        </Card>
        
        <Card className={styles.metricCard}>
          <div className={styles.metricIconWrap}><Star size={24} className={styles.metricIcon} /></div>
          <div>
            <p className={styles.metricLabel}>Avg Rating</p>
            <p className={styles.metricValue}>{summary.avgRating > 0 ? summary.avgRating : '-'}</p>
          </div>
        </Card>
        
        <Card className={styles.metricCard}>
          <div className={styles.metricIconWrap}><TrendingUp size={24} className={styles.metricIcon} /></div>
          <div>
            <p className={styles.metricLabel}>Overall Sentiment</p>
            <p className={`${styles.metricValue} ${styles['sentiment' + summary.sentiment]}`}>
              {summary.sentiment}
            </p>
          </div>
        </Card>
      </section>

      {/* Charts */}
      <section className={styles.chartsGrid}>
        {/* Trend */}
        <Card className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Ratings & Reviews Trend</h3>
          {ratingsTrend.length > 0 ? (
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ratingsTrend} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" tick={{fontSize: 12}} />
                  <YAxis yAxisId="left" domain={[0, 5]} tick={{fontSize: 12}} />
                  <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{fontSize: 12}} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="avgRating" name="Avg Rating" stroke="#e17055" activeDot={{ r: 8 }} />
                  <Line yAxisId="right" type="step" dataKey="reviews" name="Review Volume" stroke="#0984e3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={styles.chartEmpty}>No review data over time yet.</div>
          )}
        </Card>

        {/* Views */}
        <Card className={styles.chartCard}>
          <h3 className={styles.chartTitle}>
            {selectedStory === "ALL" ? "Views per Story" : "Chapter Drop-off (Views)"}
          </h3>
          {viewsChart.length > 0 ? (
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={viewsChart} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{fontSize: 12}} />
                  <YAxis allowDecimals={false} tick={{fontSize: 12}} />
                  <Tooltip cursor={{fill: 'rgba(225, 112, 85, 0.1)'}} />
                  <Bar dataKey="views" name="Views" fill="#fdcb6e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={styles.chartEmpty}>No view data yet.</div>
          )}
        </Card>

        {/* Demographics: Genres */}
        <Card className={styles.chartCard}>
          <h3 className={styles.chartTitle}><Users size={18} className={styles.titleIcon}/> Audience by Genre</h3>
          {demographics.genres.length > 0 ? (
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={demographics.genres}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {demographics.genres.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={styles.chartEmpty}>No audience data yet.</div>
          )}
        </Card>

        {/* Demographics: Country */}
        <Card className={styles.chartCard}>
          <h3 className={styles.chartTitle}><Users size={18} className={styles.titleIcon}/> Audience by Country</h3>
          {demographics.countries.length > 0 ? (
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={demographics.countries}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {demographics.countries.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={styles.chartEmpty}>No audience data yet.</div>
          )}
        </Card>
      </section>
    </div>
  );
}
