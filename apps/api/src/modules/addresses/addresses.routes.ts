import { Router } from "express";
import { addressSchema, type AddressDTO, type AddressInput } from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { Address } from "../../entities";
import { requireAuth } from "../../middleware/auth";
import { validateBody } from "../../middleware/validate";
import { asyncHandler, HttpError } from "../../utils/async-handler";

export const addressesRouter = Router();
addressesRouter.use(requireAuth);

const addressRepo = () => AppDataSource.getRepository(Address);

export function toAddressDTO(address: Address): AddressDTO {
  return {
    id: address.id,
    label: address.label,
    cep: address.cep,
    state: address.state,
    city: address.city,
    neighborhood: address.neighborhood,
    street: address.street,
    number: address.number,
    complement: address.complement ?? null,
  };
}

addressesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const addresses = await addressRepo().find({
      where: { userId: req.auth!.userId },
      order: { createdAt: "DESC" },
    });
    res.json(addresses.map(toAddressDTO));
  }),
);

addressesRouter.post(
  "/",
  validateBody(addressSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as AddressInput;
    const address = await addressRepo().save(
      addressRepo().create({ ...body, userId: req.auth!.userId }),
    );
    res.status(201).json(toAddressDTO(address));
  }),
);

addressesRouter.put(
  "/:id",
  validateBody(addressSchema),
  asyncHandler(async (req, res) => {
    const address = await addressRepo().findOneBy({ id: req.params.id, userId: req.auth!.userId });
    if (!address) {
      throw new HttpError(404, "Endereço não encontrado.");
    }
    Object.assign(address, req.body);
    await addressRepo().save(address);
    res.json(toAddressDTO(address));
  }),
);

addressesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const address = await addressRepo().findOneBy({ id: req.params.id, userId: req.auth!.userId });
    if (!address) {
      throw new HttpError(404, "Endereço não encontrado.");
    }
    await addressRepo().remove(address);
    res.status(204).send();
  }),
);
