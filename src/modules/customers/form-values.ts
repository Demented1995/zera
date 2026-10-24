export type CustomerAddressDraft = {
  label: string;
  line: string;
  city: string;
  postalCode: string;
  isPrimary: boolean;
};

export type CustomerFormValues = {
  id: string | null;
  kind: "INDIVIDUAL" | "COMPANY";
  displayName: string;
  phone: string;
  email: string;
  companyName: string;
  idno: string;
  contactName: string;
  notes: string;
  addresses: CustomerAddressDraft[];
};

export function emptyCustomerForm(): CustomerFormValues {
  return {
    id: null,
    kind: "INDIVIDUAL",
    displayName: "",
    phone: "",
    email: "",
    companyName: "",
    idno: "",
    contactName: "",
    notes: "",
    addresses: [],
  };
}
