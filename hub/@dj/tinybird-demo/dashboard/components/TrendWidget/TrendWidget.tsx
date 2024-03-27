import { BarChart } from "npm:@tremor/react@2.0.2";
import Widget from "../Widget.tsx";
import useTrend from "../../lib/hooks/use-trend.ts";
import { useMemo } from "npm:react@canary";
import moment from "npm:moment";

export default function TrendWidget() {
  const { data, status, warning } = useTrend();
  const chartData = useMemo(
    () =>
      (data?.data ?? []).map((d) => ({
        Date: moment(d.t).format("HH:mm"),
        "Number of visits": d.visits,
      })),
    [data],
  );

  return (
    <Widget>
      <div className="flex items-center justify-between">
        <Widget.Title>Users in last 30 minutes</Widget.Title>
        <h3 className="text-neutral-64 font-normal text-xl">
          {data?.totalVisits ?? 0}
        </h3>
      </div>
      <Widget.Content
        status={status}
        loaderSize={40}
        noData={!chartData?.length}
        warning={warning?.message}
      >
        <BarChart
          data={chartData}
          index="Date"
          categories={["Number of visits"]}
          colors={["blue"]}
          className="h-32"
          showXAxis={false}
          showYAxis={false}
          showLegend={false}
          showGridLines={false}
        />
      </Widget.Content>
    </Widget>
  );
}
