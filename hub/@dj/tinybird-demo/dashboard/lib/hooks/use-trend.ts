import moment from "npm:moment";
import { queryPipe } from "../api.ts";
import { Trend, TrendData } from "../types/trend.ts";
import useDateFilter from "./use-date-filter.ts";
import useQuery from "./use-query.ts";

export async function getTrend(
  date_from?: string,
  date_to?: string,
): Promise<Trend> {
  const { data } = await queryPipe<TrendData>("trend", { date_from, date_to });
  const visits = data.map(({ visits }) => visits);
  const dates = data.map(({ t }) => {
    return moment(t).format("HH:mm");
  });
  const totalVisits = visits.reduce((a, b) => a + b, 0);

  return {
    visits,
    dates,
    totalVisits,
    data,
  };
}

export default function useTrend() {
  const { startDate, endDate } = useDateFilter();
  return useQuery([startDate, endDate, "trend"], getTrend);
}
