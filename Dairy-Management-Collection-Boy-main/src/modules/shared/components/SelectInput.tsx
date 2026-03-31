import SelectField, {
  type SelectFieldProps,
} from "../../../components/selectField";

export type SelectInputProps = SelectFieldProps;

const SelectInput = (props: SelectInputProps) => {
  return <SelectField {...props} />;
};

export default SelectInput;
