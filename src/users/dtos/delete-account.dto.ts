import { ArgsType, Field, ObjectType } from '@nestjs/graphql';
import { CoreOutput } from 'src/common/dtos/output.dto';

@ArgsType()
export class DeleteAccountInput {
  @Field((type) => Number)
  userId: number;
}

@ObjectType()
export class DeleteAccountOutput extends CoreOutput {}
