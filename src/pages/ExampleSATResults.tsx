import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Calculator, CheckCircle2, Target } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageSeo } from '@/components/seo/PageSeo';
import NotFound from '@/pages/NotFound';
import { canViewExampleSatResult, exampleSatResults, getExampleSatResult } from '@/lib/example-sat-result';

type Topic = { name: string; total: number; mistakes: number; review: string; note?: string; priority?: boolean };

function TopicBreakdown({ title, topics }: { title: string; topics: readonly Topic[] }) {
  return (
    <section className="space-y-5">
      <h2 className="flex items-center justify-between gap-3 text-xl font-semibold">
        {title}<span className="text-sm font-normal text-muted-foreground">{topics.reduce((n, t) => n + t.mistakes, 0)} mistakes</span>
      </h2>
      <div className="divide-y divide-border">
        {topics.map(topic => {
          const accuracy = Math.round((topic.total - topic.mistakes) / topic.total * 100);
          return (
            <div key={topic.name} className="py-5 space-y-3">
              <div className="flex justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-medium">{topic.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{topic.total - topic.mistakes}/{topic.total} correct · {topic.mistakes} {topic.mistakes === 1 ? 'mistake' : 'mistakes'}</p>
                </div>
                <span className={`text-lg font-semibold shrink-0 ${topic.priority ? 'text-destructive' : 'text-primary'}`}>{accuracy}%</span>
              </div>
              <meter min={0} max={100} value={accuracy} aria-label={`${topic.name} accuracy`} className="w-full h-3 accent-primary" />
              {topic.priority && <p className="text-sm font-medium text-destructive">Highest review priority</p>}
              <p className="text-sm text-muted-foreground leading-relaxed">{topic.review}</p>
              {topic.note && <p className="text-xs text-muted-foreground">{topic.note}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function ExampleSATResults() {
  const { user } = useAuth();
  const { exampleId } = useParams();
  const [view, setView] = useState('results');
  const result = getExampleSatResult(exampleId);
  if (!canViewExampleSatResult(user?.email) || !result) return <NotFound />;

  const routeFor = (id: string) => (id === '1190' ? '/dashboard/tests/example/results' : `/dashboard/tests/example/${id}/results`);
  const activeId = exampleId ?? '1190';

  return (
    <DashboardLayout>
      <PageSeo title="Example SAT Results | AdaptivePrep" description="Personal demonstration of SAT mock results and topic feedback." path={`/dashboard/tests/example/${activeId}/results`} />
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      <main className="max-w-5xl mx-auto space-y-8 pb-10">
        <header className="space-y-5">
          <Button variant="ghost" asChild className="px-0"><Link to="/dashboard/tests"><ArrowLeft className="h-4 w-4" />Practice</Link></Button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-sm text-primary font-medium mb-2">Sani Amangeldi · Example result</p><h1 className="text-3xl font-bold">SAT Mock Test Results</h1></div>
            <span className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary" />Completed</span>
          </div>
          <p className="text-sm text-muted-foreground">Demonstration only · Not included in your progress or test history.</p>
          <div className="flex flex-wrap gap-2">
            {Object.values(exampleSatResults).map(example => (
              <Button key={example.id} asChild size="sm" variant={example.id === activeId ? 'default' : 'outline'}>
                <Link to={routeFor(example.id)}>{example.label}</Link>
              </Button>
            ))}
          </div>
          <Tabs value={view} onValueChange={setView}><TabsList><TabsTrigger value="results">Results</TabsTrigger><TabsTrigger value="feedback">Feedback</TabsTrigger></TabsList></Tabs>
        </header>

        {view === 'results' ? <>
          <section className="border-y border-border py-10 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Total SAT score</p>
            <div className="flex items-baseline justify-center gap-3"><span className="text-7xl font-bold text-primary">{result.overall}</span><span className="text-lg text-muted-foreground">/ 1600</span></div>
            <p className="text-sm text-muted-foreground">Reading & Writing {result.verbal} + Math {result.math}</p>
          </section>
          <div className="grid sm:grid-cols-2 gap-5">
            {[{ label: 'Reading & Writing', score: result.verbal, correct: result.verbalCorrect, total: 54, Icon: BookOpen }, { label: 'Math', score: result.math, correct: result.mathCorrect, total: 44, Icon: Calculator }].map(section => <section key={section.label} className="bg-card border border-border rounded-lg p-6 space-y-5">
              <div className="flex gap-3 items-center"><section.Icon className="h-5 w-5 text-primary" /><h2 className="font-semibold">{section.label}</h2></div>
              <p className="text-4xl font-bold">{section.score}<span className="text-base font-normal text-muted-foreground ml-2">/ 800</span></p>
              <div className="flex justify-between gap-3 text-sm"><span className="text-muted-foreground">{section.correct}/{section.total} correct</span><span>{section.total - section.correct} mistakes</span></div>
            </section>)}
          </div>
          <section className="flex flex-col sm:flex-row justify-between gap-5 border-b border-border pb-8">
            <div className="space-y-2"><h2 className="text-lg font-semibold">Your next focus</h2><p className="text-muted-foreground text-sm">{result.nextFocus}</p></div>
            <Button onClick={() => setView('feedback')}>View feedback<ArrowRight className="h-4 w-4" /></Button>
          </section>
        </> : <>
          <section className="border-y border-border py-6 flex gap-4 items-start">
            <Target className="h-6 w-6 text-primary shrink-0 mt-1" />
            <div className="space-y-2"><h2 className="text-xl font-semibold">{result.headline.title}</h2><p className="text-muted-foreground text-sm leading-relaxed">{result.headline.body}</p></div>
          </section>
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12"><TopicBreakdown title="Math" topics={result.mathTopics} /><TopicBreakdown title="Reading & Writing" topics={result.verbalTopics} /></div>
          <div className="border-t border-border pt-6"><Button variant="outline" onClick={() => setView('results')}><ArrowLeft className="h-4 w-4" />Back to results</Button></div>
        </>}
      </main>
    </DashboardLayout>
  );
}
