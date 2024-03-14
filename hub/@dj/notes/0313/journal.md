- merge .build and .run

### break plans

- yoga
- eyes out
- calving
- plan next two weeks for platform and product

---

```tsx
interface Property {
  name: string;
  type: string
}

type Time extends Property {
  type: "time";
}

type Number extends Property {
  type: "number";
}

interface Chart<
  Properties extends Record<string, Property>,
  Data extends Record<string, Value<Property>>
> {
  name: string;
  // line, bar, pie, donut, funnel, heatmap, scatter, bubble, radar, sankey, treemap, sunburst, boxplot, parallel, tree, wordcloud, calendar, gauge, funnel, timeline
  type: string;
  data: Data[];
};

type LineChart extends Chart<
  Properties extends Record<string, Property>,
  Data extends Record<string, Value<Property>>
> {
  type: "line";
  x: Property;
  lines: Array<{
    title: string;
    y: Property;
  }>;
};

type Metric = {
  name: string;
  charts: Chart[];
};

type Funnel = {
  name: string;
  input: Metric;
  steps: Metric[];
};

type Relation = {
  from: Funnel;
  to: Funnel;
};

type Analytics = {
  funnels: Funnel[];
  relations: Relation[];
};

const Analytics = ({ funnels }: Analytics) => {
  const [activeFunnel, setActiveFunnel] = useState("conversion");

  return (
    <Y>
      <Flow funnels={funnels} />
      <Funnel funnel={activeFunnel} />
    </Y>
  );
};

const Funnel = ({ funnel }: { funnel: string }) => {
  const [activeStep, setActiveStep] = useState(funnel.steps[0]);

  return (
    <Y>
      <Y>
        {funnel.steps.map((step) => <Funnel.Step step={step} />)}
      </Y>
    </Y>
  );
};
```
