import InputField, {
  type InputFieldProps,
} from "../../../components/inputField";

export type FormInputProps = InputFieldProps;

const FormInput = (props: FormInputProps) => {
  return <InputField {...props} />;
};

export default FormInput;
