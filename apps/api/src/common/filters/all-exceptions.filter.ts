import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '@cit9/types';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorMessage = 'An unexpected error occurred. Please try again later.';
    let errorDetails: Record<string, unknown> | null = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        errorMessage = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        errorMessage = (obj.message as string) || exception.message;
        errorCode = (obj.error as string) || exception.name;
        if (Array.isArray(obj.message)) {
          errorDetails = { validationErrors: obj.message };
          errorMessage = 'Validation failed';
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception on ${request.method} ${request.url}: ${exception.message}`, exception.stack);
      // In production, keep internal message hidden
      if (process.env.NODE_ENV !== 'production') {
        errorMessage = exception.message;
      }
    }

    const payload: ApiResponse<null> = {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        details: errorDetails,
      },
      meta: {
        serverTime: new Date().toISOString(),
        path: request.url,
      },
    };

    response.status(status).json(payload);
  }
}
