import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { logoutAction } from '../actions/logoutAction';
import { useNavigate } from 'react-router-dom';

interface InactivityWarningModalProps {
  isOpen: boolean;
  onExtend: () => void;
}

export function InactivityWarningModal({ isOpen, onExtend }: InactivityWarningModalProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutAction();
    navigate('/login');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onExtend}
      title="Session expiring soon"
      footer={
        <div className="flex justify-end space-x-3 w-full">
          <Button variant="secondary" onClick={handleLogout}>
            Sign out now
          </Button>
          <Button variant="primary" onClick={onExtend}>
            Stay signed in
          </Button>
        </div>
      }
    >
      <p className="text-sm text-slate-600">
        You have been inactive for a while. You will be signed out in 1 minute to protect your account.
      </p>
    </Modal>
  );
}
