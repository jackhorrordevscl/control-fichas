import {
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

export const CurrentUser = createParamDecorator(
  (
    data: unknown,
    ctx: ExecutionContext,
  ): AuthenticatedUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<RequestWithUser>();

    return {
      ...request.user,
      correlationId: request.correlationId,
    };
  },
);