import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface ReportIssueButtonProps {
  questionId: string;
  questionText: string;
  mode: 'pregenerated' | 'generated';
  modelUsed?: string | null;
  userSelectedAnswer?: string | null;
  correctAnswer: string;
  explanation?: string | null;
}

export function ReportIssueButton({
  questionId,
  questionText,
  mode,
  modelUsed,
  userSelectedAnswer,
  correctAnswer,
  explanation,
}: ReportIssueButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [issueType, setIssueType] = useState<string>('');
  const [freeText, setFreeText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!issueType) {
      toast({
        title: 'Select an issue type',
        description: 'Please choose what type of problem you found.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/report-bug`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question_id: questionId,
            question_text: questionText.length > 500 ? questionText.slice(0, 500) + '...' : questionText,
            mode,
            model_used: modelUsed ?? null,
            user_selected_answer: userSelectedAnswer ?? null,
            correct_answer: correctAnswer,
            explanation: explanation ?? null,
            issue_type: issueType as any,
            free_text: freeText.trim() || null,
            user_tier: 'free', // TODO: Get from user profile
            timestamp_iso: new Date().toISOString(),
            user_agent: navigator.userAgent,
            session_id: session.id,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit report');
      }

      const result = await response.json();

      setIsOpen(false);
      setIssueType('');
      setFreeText('');

      toast({
        title: 'Report submitted',
        description: result.status === 'deduplicated'
          ? 'Thanks! This issue is already being tracked.'
          : 'Thanks! A new issue has been created.',
      });
    } catch (error) {
      console.error('Report bug error:', error);
      toast({
        title: 'Failed to submit report',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
      >
        ⚠️ Report Issue
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Report a Problem</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  What's wrong with this question?
                </label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full p-2 border rounded-md bg-background"
                >
                  <option value="">Select an issue type</option>
                  <option value="wrong_answer_key">Wrong answer key</option>
                  <option value="unclear_wording">Unclear/confusing wording</option>
                  <option value="rendering_bug">Rendering bug (images/math not loading)</option>
                  <option value="duplicate">Duplicate question</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Additional details (optional)
                </label>
                <textarea
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  maxLength={200}
                  placeholder="Add any extra details..."
                  className="w-full p-2 border rounded-md bg-background resize-none"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {freeText.length}/200 characters
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIssueType('');
                    setFreeText('');
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm border rounded-md hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !issueType}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Send Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
