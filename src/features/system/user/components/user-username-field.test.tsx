import { useForm } from 'react-hook-form'
import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { Form } from '@/components/ui/form'
import { buildUserUpdatePayload } from '../model'
import { UserUsernameField } from './user-username-field'
import {
  buildUserActionDefaultValues,
  type UserActionForm,
} from './users-action-dialog-form'

function UserEditForm() {
  const form = useForm<UserActionForm>({
    defaultValues: { ...buildUserActionDefaultValues(), username: 'alice' },
  })
  return (
    <Form {...form}>
      <UserUsernameField control={form.control} />
    </Form>
  )
}

test('renders an editable username and sends the replacement in the user update', () => {
  const markup = renderToStaticMarkup(<UserEditForm />)
  expect(markup).toContain('name="username"')
  expect(markup).toContain('value="alice"')
  expect(markup).not.toMatch(/<input[^>]*\sdisabled=/)

  expect(
    buildUserUpdatePayload({
      ...buildUserActionDefaultValues(),
      id: '2',
      version: '4',
      username: 'alice_new',
    })
  ).toMatchObject({ id: '2', version: '4', username: 'alice_new' })
})
