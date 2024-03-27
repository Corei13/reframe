import Widget from "../Widget.tsx";
import KPIsTabs from "./KpisTabs.tsx";
import useKpis from "../../lib/hooks/use-kpis.ts";
import useKpiTotals from "../../lib/hooks/use-kpi-totals.ts";
import { AreaChart } from "npm:@tremor/react@2.0.2";
import { useMemo } from "npm:react@canary";

export default function KPIsWidget() {
  const { data, kpi, setKpi, kpiOption, warning, status } = useKpis();
  const { data: kpiTotals, warning: warningTotals } = useKpiTotals();
  const chartData = useMemo(
    () =>
      (data?.dates ?? []).map((date, index) => {
        const value = Math.max(
          Number(data?.data[0][index]) || 0,
          Number(data?.data[1][index]) || 0,
        );

        return {
          date: date.toUpperCase(),
          [kpiOption.label]: value,
        };
      }),
    [data?.data, data?.dates, kpiOption],
  );

  console.log("KPIsWidget", chartData, data);
  return (
    <Widget>
      <Widget.Title isVisuallyHidden>KPIs</Widget.Title>
      <KPIsTabs value={kpi} onChange={setKpi} totals={kpiTotals} />
      <Widget.Content
        status={status}
        noData={!chartData?.length}
        warning={warning?.message}
        className="pt-2 mt-4"
      >
        <AreaChart
          data={chartData}
          index="date"
          categories={[kpiOption.label]}
          colors={["blue"]}
          valueFormatter={kpiOption.formatter}
          showLegend={false}
        />
      </Widget.Content>
    </Widget>
  );
}