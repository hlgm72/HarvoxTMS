import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Building2, UserPlus } from 'lucide-react';
import { useFleetNotifications } from '@/components/notifications';
import { supabase } from '@/integrations/supabase/client';
import { handleTextBlur, handleEmailInput } from '@/lib/textUtils';

interface InviteCompanyOwnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: {
    id: string;
    name: string;
  } | null;
}

export function InviteCompanyOwnerDialog({ 
  open, 
  onOpenChange, 
  company 
}: InviteCompanyOwnerDialogProps) {
  const { showSuccess, showError } = useFleetNotifications();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!company || !handleTextBlur(email)) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: session } = await supabase.auth.getSession();
      
      console.log("Current session:", session);
      
      if (!session.session) {
        throw new Error('Not authenticated');
      }

      console.log("User ID:", session.session.user.id);
      console.log("Access token length:", session.session.access_token.length);

      const { data: result, error: functionError } = await supabase.functions.invoke('send-company-owner-invitation', {
        body: {
          companyId: company.id,
          email: handleEmailInput(email),
          companyName: company.name
        },
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`
        }
      });

      if (functionError) {
        console.error('Function error:', functionError);
        throw new Error(functionError.message || 'Error sending invitation');
      }

      if (!result || !result.success) {
        console.error('Function result error:', result);
        throw new Error(result?.error || 'Error sending invitation');
      }

      showSuccess(
        "Invitation Sent!",
        `Company Owner invitation has been sent to ${email}. They will receive an email with instructions to set up their account.`
      );

      // Reset form and close dialog
      setEmail('');
      onOpenChange(false);

    } catch (err: any) {
      setError(err.message || 'Error sending invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (error) setError('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Company Owner
          </DialogTitle>
          <DialogDescription>
            Send an invitation to create the first Company Owner account for{' '}
            <strong>{company?.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h4 className="font-medium text-gray-900">{company?.name}</h4>
                <p className="text-sm text-gray-600">Creating Company Owner for this company</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  placeholder="owner@company.com"
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
              <p className="text-sm text-gray-500">
                The person will receive an email invitation to set up their Company Owner account
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <h4 className="font-medium text-amber-800 mb-1">What happens next?</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• An invitation email will be sent to this address</li>
                <li>• They'll create their own password securely</li>
                <li>• They'll be automatically assigned as Company Owner</li>
                <li>• The invitation expires in 7 days</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !handleTextBlur(email)}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}