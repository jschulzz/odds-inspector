import { Accordion } from "@chakra-ui/react";
import { FilterGroup } from "./filter-group";

export type FilterOptions = {
  id: string;
  display: string;
  options: Option[];
};

export type Option = {
  display: string;
  id: string;
};

export const Filters = ({
  options,
  onChange
}: {
  options: FilterOptions[];
  onChange: (x: any) => any;
}) => {
  const filters: any = {};
  options.forEach((option) => {
    filters[option.id] = option.options.map((x) => x.id);
  });
  const handleChange = (key: string, values: string[]) => {
    filters[key] = values.flat();
    onChange(filters);
  };
  //   onChange(filters);
  return (
    <Accordion allowMultiple defaultIndex={[]} zIndex={3} backgroundColor={"white"} minW="15rem">
      {options.map((option) => {
        return (
          <FilterGroup
            options={option.options}
            displayTitle={option.display}
            key={option.id}
            onChange={(x) => handleChange(option.id, x)}
          />
        );
      })}
    </Accordion>
  );
};
