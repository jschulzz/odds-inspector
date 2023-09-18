import {
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Checkbox,
  CheckboxGroup,
  Stack
} from "@chakra-ui/react";
import { Option } from "./filters";

export const FilterGroup = ({
  displayTitle,
  options,
  onChange
}: {
  displayTitle: string;
  options: Option[];
  onChange: (x: any) => any;
}) => {
  if (!options.length) {
    return <></>;
  }
  const handleCheckboxChange = (...args: any[]) => {
    onChange(args);
  };
  return (
    <AccordionItem backgroundColor="inherit" boxShadow="2px 2px 5px rgba(0,0,0,0.2)">
      <AccordionButton>{displayTitle}</AccordionButton>
      <AccordionPanel>
        <CheckboxGroup onChange={handleCheckboxChange} defaultValue={options.map((x) => x.id)}>
          <Stack direction="column" spacing={[1, 5]}>
            {options.map((option) => (
              <Checkbox value={option.id} key={option.id}>
                {option.display}
              </Checkbox>
            ))}
          </Stack>
        </CheckboxGroup>
      </AccordionPanel>
    </AccordionItem>
  );
};
