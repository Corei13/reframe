import useSWR from "npm:swr";
import { querySQL } from "../api.ts";

async function getCurrentVisitors(): Promise<number> {
  const { data } = await querySQL<{ visits: number }>(
    `SELECT uniq(session_id) AS visits FROM analytics_hits
      WHERE timestamp >= (now() - interval 5 minute) FORMAT JSON`,
  );
  const [{ visits }] = data;
  return visits;
}

export default function useCurrentVisitors() {
  const { data } = useSWR("currentVisitors", getCurrentVisitors);
  return data ?? 0;
}
