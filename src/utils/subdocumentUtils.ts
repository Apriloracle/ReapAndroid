export const storeSubdocumentGUID = (guid: string) => {
  localStorage.setItem('userSubdocumentGUID', guid);
};

export const getSubdocumentGUID = (): string | null => {
  return localStorage.getItem('userSubdocumentGUID');
};
