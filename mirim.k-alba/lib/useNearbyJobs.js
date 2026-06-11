"use client";
import { useState, useEffect } from "react";
import { getJobs } from "./supabase";

export function useNearbyJobs({ latitude, longitude, radius = 10, limit = 20, enabled = true }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !latitude || !longitude) {
      setJobs([]);
      return;
    }

    setLoading(true);
    setError(null);

    getJobs()
      .then((allJobs) => {
        const nearby = allJobs.filter((job) => {
          if (!job.latitude || !job.longitude) return false;
          const distance = calculateDistance(latitude, longitude, job.latitude, job.longitude);
          return distance <= radius;
        });

        setJobs(nearby.slice(0, limit));
      })
      .catch((err) => {
        setError(err);
        setJobs([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [latitude, longitude, radius, limit, enabled]);

  return { jobs, loading, error };
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}
