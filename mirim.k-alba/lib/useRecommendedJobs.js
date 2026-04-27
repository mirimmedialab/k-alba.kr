"use client";
import { useState, useEffect } from "react";
import { getJobs } from "./supabase";

export function useRecommendedJobs({
  userVisa,
  userKoreanLevel,
  userTransport,
  radius = 10,
  limit = 50,
  enabled = true,
}) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setJobs([]);
      return;
    }

    setLoading(true);
    setError(null);

    getJobs()
      .then((allJobs) => {
        // Filter and score jobs based on user profile
        const scored = allJobs.map((job) => {
          let score = 0;

          // Visa match
          if (userVisa && job.visa_types?.includes(userVisa)) {
            score += 10;
          }

          // Korean level match
          if (userKoreanLevel && job.korean_level) {
            const levels = ["beginner", "intermediate", "advanced"];
            const userLevel = levels.indexOf(userKoreanLevel);
            const jobLevel = levels.indexOf(job.korean_level);
            if (userLevel >= jobLevel) {
              score += 5;
            }
          }

          // Recency bonus
          const daysOld = (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24);
          if (daysOld < 7) score += 3;
          else if (daysOld < 14) score += 2;
          else if (daysOld < 30) score += 1;

          return { ...job, score };
        });

        // Sort by score and take top N
        const recommended = scored.sort((a, b) => b.score - a.score).slice(0, limit);
        setJobs(recommended);
      })
      .catch((err) => {
        setError(err);
        setJobs([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userVisa, userKoreanLevel, userTransport, radius, limit, enabled]);

  return { jobs, loading, error };
}
