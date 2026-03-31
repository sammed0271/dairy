import ConfirmModal, {
  type ConfirmModalProps,
} from "../../../components/confirmModal";

export type ConfirmDialogProps = ConfirmModalProps;

const ConfirmDialog = (props: ConfirmDialogProps) => {
  return <ConfirmModal {...props} />;
};

export default ConfirmDialog;
